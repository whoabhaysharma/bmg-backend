import { SubscriptionStatus, PlanType } from '@prisma/client';
import prisma from '../lib/prisma';
import { paymentService } from './payment.service.js';
import { v4 as uuidv4 } from 'uuid';

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
    // 1. Fetch Plan, User, and Gym details
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, name: true, price: true, durationValue: true, durationUnit: true },
    });

    if (!plan) {
      throw new Error('SUBSCRIPTION_PLAN_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, mobileNumber: true },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { id: true, name: true },
    });

    if (!gym) {
      throw new Error('GYM_NOT_FOUND');
    }

    // Set temporary dates. Actual start/end dates are determined upon payment success.
    const now = new Date();

    // 2. Create the Subscription record (PENDING)
    // We create this first to have an ID for the receipt.
    // If the Razorpay order fails, we should delete this to avoid zombie records.
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        gymId,
        planId,
        startDate: now,
        endDate: now,
        status: SubscriptionStatus.PENDING,
        accessCode: generateAccessCode(),
      },
    });

    let order;
    try {
      // 3. Create Razorpay Order (using subscription ID as receipt)
      order = await paymentService.createOrder(
        plan.price,
        subscription.id, // receipt
        'INR' // currency
      );
    } catch (error) {
      // If order creation fails, cleanup the subscription
      await prisma.subscription.delete({ where: { id: subscription.id } });
      throw error;
    }

    // 4. Save PENDING payment record
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: plan.price,
        razorpayOrderId: order.id,
        status: 'PENDING',
      },
    });

    // 5. Construct Intuitive Response
    return {
      subscription,
      order,
      // Provide pre-filled data for the frontend
      razorpayOptions: {
        key: process.env.RAZORPAY_KEY_ID, // Use environment variable
        amount: order.amount, // Amount in paise from the order object
        currency: order.currency,
        name: gym.name, // Display Gym Name in the payment modal
        description: plan.name, // Display Plan Name as description
        order_id: order.id,
        prefill: {
          name: user.name || '',
          contact: user.mobileNumber || '',
        },
        notes: {
          subscriptionId: subscription.id,
          gymId: gym.id,
        }
      }
    };
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
    // 1. Fetch Payment Record with necessary relations using findFirst since razorpayOrderId is not unique in schema
    const payment = await prisma.payment.findFirst({
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

    // Ensure subscription is loaded
    if (!payment.subscription) {
       throw new Error('SUBSCRIPTION_NOT_FOUND_FOR_PAYMENT');
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
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });
      throw new Error('INVALID_PAYMENT_SIGNATURE');
    }

    // 3. Update Payment Status and Activate Subscription Atomically
    const { durationValue, durationUnit } = payment.subscription.plan;
    const startDate = new Date();
    const endDate = calculateSubscriptionEndDate(startDate, durationValue, durationUnit);

    const [updatedPayment, updatedSubscription] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId,
          razorpaySignature,
        },
      }),
      prisma.subscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
      }),
    ]);

    return updatedSubscription;
  }
}

export const subscriptionService = new SubscriptionService();
