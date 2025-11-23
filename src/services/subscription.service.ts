import { PrismaClient, SubscriptionStatus, PlanType, Payment } from '@prisma/client';
import { paymentService } from './payment.service.js';
import { v4 as uuidv4 } from 'uuid';

// --- Configuration & Initialization ---

const prisma = new PrismaClient();

// Constants for Access Code Generation
const ACCESS_CODE_LENGTH = 8;

// --- Utility Functions (for better separation of concerns) ---

/**
 * Calculates the subscription end date based on the start date and plan duration.
 * This is pulled out for better testability and readability.
 */
const calculateSubscriptionEndDate = (
  startDate: Date,
  durationValue: number,
  durationUnit: PlanType
): Date => {
  const endDate = new Date(startDate);
  switch (durationUnit) {
    case 'DAY':
      endDate.setDate(endDate.getDate() + durationValue);
      break;
    case 'WEEK':
      endDate.setDate(endDate.getDate() + durationValue * 7);
      break;
    case 'MONTH':
      // Using setMonth handles month-end correctly (e.g., Jan 31 + 1 month = Feb 28/29)
      endDate.setMonth(endDate.getMonth() + durationValue);
      break;
    case 'YEAR':
      endDate.setFullYear(endDate.getFullYear() + durationValue);
      break;
    default:
      // Handle potential future PlanTypes safely
      throw new Error(`Unsupported duration unit: ${durationUnit}`);
  }
  return endDate;
};

/**
 * Generates a short, unique access code.
 */
const generateAccessCode = (): string => {
  return uuidv4().substring(0, ACCESS_CODE_LENGTH).toUpperCase();
}

// --- Main Service Class ---

class SubscriptionService {

  /**
   * Creates a PENDING subscription, generates a unique access code, 
   * creates a Razorpay order, and records the initial PENDING payment.
   * * @returns An object containing the created subscription and the Razorpay order details.
   */
  async createSubscription(userId: string, planId: string, gymId: string) {
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, price: true, durationValue: true, durationUnit: true }, // Select only necessary fields
    });

    if (!plan) {
      throw new Error('SUBSCRIPTION_PLAN_NOT_FOUND');
    }

    // Set temporary dates. Actual start/end dates are determined upon payment success.
    const now = new Date();

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        gymId,
        planId,
        // Set initial dates to NOW, they will be updated on payment success.
        startDate: now,
        endDate: now,
        status: SubscriptionStatus.PENDING,
        accessCode: generateAccessCode(),
      },
    });

    // 1. Create Razorpay Order (using subscription ID as receipt)
    const order = await paymentService.createOrder(
      plan.price,
      subscription.id, // receipt
      'INR' // currency
    );

    // 2. Save PENDING payment record
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: plan.price,
        razorpayOrderId: order.id,
        status: 'PENDING',
      },
    });

    return { subscription, order };
  }

  /**
   * Processes a successful payment webhook/redirect.
   * Verifies the signature, updates payment status, and activates the subscription.
   * * @returns The updated, ACTIVE subscription record.
   */
  async handlePaymentSuccess(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    // 1. Fetch Payment Record with necessary relations
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: {
        subscription: {
          select: {
            id: true,
            planId: true,
            plan: { select: { durationValue: true, durationUnit: true } }
          }
        }
      },
    });

    if (!payment) {
      throw new Error('PAYMENT_RECORD_NOT_FOUND');
    }

    // Check if payment is already completed to prevent double processing
    if (payment.status === 'COMPLETED') {
      return prisma.subscription.findUnique({ where: { id: payment.subscription.id } });
    }

    // 2. Verify Signature
    const isValid = paymentService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      // Update payment status to FAILED before throwing the error
      await this.updatePaymentStatus(payment.id, 'FAILED');
      throw new Error('INVALID_PAYMENT_SIGNATURE');
    }

    // 3. Update Payment Status to COMPLETED
    await this.updatePaymentStatus(payment.id, 'COMPLETED', {
      razorpayPaymentId,
      razorpaySignature,
    });

    // 4. Activate Subscription and Update Dates
    const { durationValue, durationUnit } = payment.subscription.plan;
    const startDate = new Date();
    const endDate = calculateSubscriptionEndDate(startDate, durationValue, durationUnit);

    const updatedSubscription = await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
    });

    return updatedSubscription;
  }

  /**
   * Internal helper to update payment status with optional Razorpay details.
   */
  private async updatePaymentStatus(
    paymentId: string,
    status: Payment['status'],
    razorpayDetails?: { razorpayPaymentId: string; razorpaySignature: string }
  ) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...razorpayDetails,
      },
    });
  }

}

export const subscriptionService = new SubscriptionService();