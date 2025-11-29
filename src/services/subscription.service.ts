import { PaymentStatus, PrismaClient, SubscriptionStatus, PlanType, Payment, NotificationType, SubscriptionSource } from '@prisma/client';
import { paymentService } from './payment.service';
import { notificationService } from './notification.service';
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
  async createSubscription(userId: string, planId: string, gymId: string, source: SubscriptionSource = SubscriptionSource.APP) {
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        price: true,
        name: true,
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
        source,
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

    // --- Notification: Payment Pending ---
    try {
      await notificationService.createNotification(
        userId,
        'Payment Initiated',
        `Please complete your payment of ${plan.price} for "${plan.name}".`,
        NotificationType.INFO
      );
    } catch (error) {
      console.error('Failed to send payment pending notification:', error);
    }

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
            user: true,
            gym: {
              include: {
                owner: true
              }
            }
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
    const updatedSubscription = await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
    });

    // --- Notifications (Non-blocking) ---
    try {
      // 1. Notify User (Subscriber)
      await notificationService.createNotification(
        payment.subscription.userId,
        'Subscription Activated',
        `Your subscription to "${payment.subscription.plan.name}" at "${payment.subscription.gym.name}" is now active.`,
        NotificationType.SUCCESS
      );

      // 2. Notify Gym Owner
      await notificationService.createNotification(
        payment.subscription.gym.ownerId,
        'New Subscription',
        `${payment.subscription.user.name} has subscribed to "${payment.subscription.plan.name}".`,
        NotificationType.INFO
      );
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }

    return updatedSubscription;
  },

  // Get subscriptions by gym ID with pagination and filtering
  async getSubscriptionsByGym(
    gymId: string,
    page: number = 1,
    limit: number = 10,
    status?: SubscriptionStatus
  ) {
    const skip = (page - 1) * limit;
    const where: any = { gymId };

    if (status) {
      where.status = status;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              mobileNumber: true,
            },
          },
          plan: {
            select: {
              name: true,
              price: true,
              durationValue: true,
              durationUnit: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.count({ where }),
    ]);

    return {
      data: subscriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Manual Activation (Admin/Owner)
  async manualActivateSubscription(subscriptionId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        user: true,
        gym: true,
      },
    });

    if (!subscription) throw new Error('Subscription not found');

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      throw new Error('Subscription is already active');
    }

    const { durationValue, durationUnit } = subscription.plan;
    const startDate = new Date();
    const endDate = calculateSubscriptionEndDate(startDate, durationValue, durationUnit);

    // Update subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
      },
    });

    // Update pending payment if exists
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        subscriptionId,
        status: PaymentStatus.PENDING,
      },
    });

    if (pendingPayment) {
      await prisma.payment.update({
        where: { id: pendingPayment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          // We can add a note field later if needed, for now just mark completed
        },
      });
    }

    // Notifications
    try {
      await notificationService.createNotification(
        subscription.userId,
        'Subscription Activated',
        `Your subscription to "${subscription.plan.name}" at "${subscription.gym.name}" has been manually activated.`,
        NotificationType.SUCCESS
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return updatedSubscription;
  },

  // Create subscription via Console (Owner/Admin) - Auto Active
  async createConsoleSubscription(userId: string, planId: string, gymId: string) {
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new Error('SUBSCRIPTION_PLAN_NOT_FOUND');

    // Check existing active
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
    const endDate = calculateSubscriptionEndDate(now, plan.durationValue, plan.durationUnit);

    // Create Active Subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        gymId,
        planId,
        startDate: now,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        accessCode: generateAccessCode(),
        source: SubscriptionSource.CONSOLE,
      },
    });

    // Create Completed Payment (Cash/Manual)
    await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: plan.price,
        status: PaymentStatus.COMPLETED,
        method: 'CASH', // or 'CONSOLE'
      },
    });

    // Notification
    try {
      await notificationService.createNotification(
        userId,
        'Membership Added',
        `A new membership "${plan.name}" has been added to your account by the gym.`,
        NotificationType.SUCCESS
      );
    } catch (error) {
      console.error('Failed to send console subscription notification:', error);
    }

    return subscription;
  },
};
