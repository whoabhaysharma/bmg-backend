import { PaymentStatus, PrismaClient, SubscriptionStatus, PlanType, Payment } from '@prisma/client';
import { paymentService } from './payment.service';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const ACCESS_CODE_LENGTH = 8;

// --- helpers ---

const calculateSubscriptionEndDate = (
  start: Date,
  durationValue: number,
  durationUnit: PlanType
) => {
  const end = new Date(start);

  switch (durationUnit) {
    case PlanType.DAY:
      end.setDate(end.getDate() + durationValue);
      break;
    case PlanType.WEEK:
      end.setDate(end.getDate() + durationValue * 7);
      break;
    case PlanType.MONTH:
      end.setMonth(end.getMonth() + durationValue);
      break;
    case PlanType.YEAR:
      end.setFullYear(end.getFullYear() + durationValue);
      break;
    default:
      throw new Error(`Unsupported duration unit: ${durationUnit}`);
  }

  return end;
};

const generateAccessCode = () =>
  uuidv4().substring(0, ACCESS_CODE_LENGTH).toUpperCase();

const updatePaymentStatus = async (
  id: string,
  status: Payment['status'],
  details?: { razorpayPaymentId: string; razorpaySignature: string }
) => {
  await prisma.payment.update({
    where: { id },
    data: { status, ...details },
  });
};

// --- service ---

export const subscriptionService = {
  // Create pending subscription + order
  async createSubscription(userId: string, planId: string, gymId: string) {
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        price: true,
        durationValue: true,
        durationUnit: true,
      },
    });

    if (!plan) throw new Error('SUBSCRIPTION_PLAN_NOT_FOUND');

    // --- Check existing active subscription (tests expect EXACT wording) ---
    const existing = await prisma.subscription.findFirst({
      where: {
        userId,
        gymId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new Error('User already has an active subscription');
    }

    const now = new Date();

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

    // --- Payment Order Creation ---
    let order;
    try {
      order = await paymentService.createOrder(plan.price, subscription.id);
    } catch (err) {
      // match test’s expected error mapping
      throw new Error('PAYMENT_SERVICE_ERROR');
    }

    // Create DB payment row
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: plan.price,
        razorpayOrderId: order.id,
        status: PaymentStatus.PENDING,
      },
    });

    return { subscription, order };
  },

  // Handle successful payment
  async handlePaymentSuccess(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) {
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!payment) throw new Error('PAYMENT_RECORD_NOT_FOUND');

    // Already completed (test checks this)
    if (payment.status === PaymentStatus.COMPLETED) {
      return prisma.subscription.findUnique({
        where: { id: payment.subscription.id },
      });
    }

    // Signature verified **in controller** — controller handles invalid signature
    // so here we assume signature is already valid.

    // Update payment → completed
    await updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
      razorpayPaymentId,
      razorpaySignature,
    });

    const { durationValue, durationUnit } = payment.subscription.plan;

    const startDate = new Date();
    const endDate = calculateSubscriptionEndDate(startDate, durationValue, durationUnit);

    // Activate subscription
    return prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
    });
  },
};
