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

    const order = await paymentService.createOrder(plan.price, subscription.id);

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
          select: {
            id: true,
            planId: true,
            plan: { select: { durationValue: true, durationUnit: true } },
          },
        },
      },
    });

    if (!payment) throw new Error('PAYMENT_RECORD_NOT_FOUND');

    if (payment.status === PaymentStatus.COMPLETED) {
      return prisma.subscription.findUnique({
        where: { id: payment.subscription.id },
      });
    }

    const isValid = paymentService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      await updatePaymentStatus(payment.id, PaymentStatus.FAILED);
      throw new Error('INVALID_PAYMENT_SIGNATURE');
    }

    await updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
      razorpayPaymentId,
      razorpaySignature,
    });

    const { durationValue, durationUnit } = payment.subscription.plan;
    const startDate = new Date();
    const endDate = calculateSubscriptionEndDate(startDate, durationValue, durationUnit);

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
