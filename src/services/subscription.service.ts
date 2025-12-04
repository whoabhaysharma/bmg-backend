import { PaymentStatus, PrismaClient, SubscriptionStatus, PlanType, Payment, SubscriptionSource, PaymentMethod } from '@prisma/client';
import { paymentService } from './payment.service';
import { notificationService } from './notification.service';
import { NotificationEvent } from '../types/notification-events';
import { randomUUID } from 'crypto';

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
  randomUUID().substring(0, ACCESS_CODE_LENGTH).toUpperCase();

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

    // Get gym details for notification
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { name: true },
    });

    if (!gym) throw new Error('GYM_NOT_FOUND');

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
    const endDate = calculateSubscriptionEndDate(now, plan.durationValue, plan.durationUnit);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        gymId,
        planId,
        startDate: now,
        endDate: endDate,
        status: SubscriptionStatus.PENDING,
        accessCode: generateAccessCode(),
        source,
      },
    });

    // --- Payment Order Creation ---
    let order;
    try {
      order = await paymentService.createOrder(plan.price, subscription.id, 'INR', {
        subscriptionId: subscription.id
      });
    } catch (err) {
      // match test's expected error mapping
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

    // ✅ Event-based notification - Subscription Created
    await notificationService.notifyUser(
      userId,
      NotificationEvent.SUBSCRIPTION_CREATED,
      {
        planName: plan.name,
        gymName: gym.name,
        endDate: endDate
      }
    );

    // ✅ Event-based notification - Payment Initiated
    await notificationService.notifyUser(
      userId,
      NotificationEvent.PAYMENT_INITIATED,
      {
        amount: plan.price,
        planName: plan.name
      }
    );

    return { subscription, order };
  },

  // Handle successful payment
  async handlePaymentSuccess(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    subscriptionId?: string
  ) {
    console.log('Handling Payment Success:', { razorpayOrderId, razorpayPaymentId, subscriptionId });

    let payment;

    // 1. Try finding by Order ID or Payment ID
    if (razorpayOrderId || razorpayPaymentId) {
      payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { razorpayOrderId: razorpayOrderId || undefined },
            { razorpayPaymentId: razorpayPaymentId || undefined }
          ]
        },
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
      console.log('Lookup by ID result:', payment ? 'Found' : 'Not Found');
    }

    // 2. Fallback: Try finding by Subscription ID (Pending Payment)
    if (!payment && subscriptionId) {
      console.log('Payment not found by IDs, trying subscriptionId:', subscriptionId);
      payment = await prisma.payment.findFirst({
        where: {
          subscriptionId: subscriptionId,
          status: PaymentStatus.PENDING
        },
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
      console.log('Lookup by SubscriptionID result:', payment ? 'Found' : 'Not Found');
    }

    if (!payment) {
      console.error('CRITICAL: Payment record not found for', { razorpayOrderId, razorpayPaymentId, subscriptionId });
      throw new Error('PAYMENT_RECORD_NOT_FOUND');
    }

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

    // Get updated subscription with access code
    const fullSubscription = await prisma.subscription.findUnique({
      where: { id: updatedSubscription.id },
      select: { accessCode: true },
    });

    // ✅ Event-based notification - Payment Completed
    await notificationService.notifyUser(
      payment.subscription.userId,
      NotificationEvent.PAYMENT_COMPLETED,
      {
        amount: payment.amount,
        planName: payment.subscription.plan.name,
        transactionId: razorpayPaymentId
      }
    );

    // ✅ Event-based notification - Subscription Activated (User)
    await notificationService.notifyUser(
      payment.subscription.userId,
      NotificationEvent.SUBSCRIPTION_ACTIVATED,
      {
        planName: payment.subscription.plan.name,
        gymName: payment.subscription.gym.name,
        accessCode: fullSubscription?.accessCode || ''
      }
    );

    // ✅ Send WhatsApp Notification with Access Code
    try {
      const user = payment.subscription.user;
      if (user.mobileNumber) {
        await fetch(`${process.env.WHATSAPP_WEBHOOK_URL}/internal/access-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.WHATSAPP_BACKEND_SECRET || ''
          },
          body: JSON.stringify({
            mobile: user.mobileNumber,
            accessCode: fullSubscription?.accessCode,
            gymName: payment.subscription.gym.name,
            planName: payment.subscription.plan.name,
            endDate: endDate
          })
        });
      }
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      // Don't block the flow
    }

    // ✅ Event-based notification - New Subscription (Gym Owner)
    await notificationService.notifyUser(
      payment.subscription.gym.ownerId,
      NotificationEvent.SUBSCRIPTION_CREATED,
      {
        planName: payment.subscription.plan.name,
        gymName: payment.subscription.gym.name,
        endDate: endDate
      }
    );

    return updatedSubscription;
  },

  // Get subscriptions by gym ID with pagination and filtering
  async getSubscriptionsByGym(
    gymId: string,
    page: number = 1,
    limit: number = 10,
    status?: SubscriptionStatus
  ) {
    return this.getAllSubscriptions({ gymId, page, limit, status });
  },

  // Generic Get All Subscriptions (Admin/Owner)
  async getAllSubscriptions(filters: {
    gymId?: string | string[];
    userId?: string;
    status?: SubscriptionStatus;
    page?: number;
    limit?: number;
  }) {
    const { gymId, userId, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (gymId) {
      if (Array.isArray(gymId)) {
        where.gymId = { in: gymId };
      } else {
        where.gymId = gymId;
      }
    }

    if (userId) where.userId = userId;
    if (status) where.status = status;

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
          gym: {
            select: {
              name: true
            }
          }
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

    // ✅ Event-based notification - Subscription Activated
    await notificationService.notifyUser(
      subscription.userId,
      NotificationEvent.SUBSCRIPTION_ACTIVATED,
      {
        planName: subscription.plan.name,
        gymName: subscription.gym.name,
        accessCode: subscription.accessCode
      }
    );

    return updatedSubscription;
  },

  // Create subscription via Console (Owner/Admin) - Auto Active
  async createConsoleSubscription(userId: string, planId: string, gymId: string) {
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new Error('SUBSCRIPTION_PLAN_NOT_FOUND');

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { name: true, ownerId: true },
    });

    if (!gym) throw new Error('GYM_NOT_FOUND');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

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
        method: PaymentMethod.CONSOLE,
      },
    });

    // ✅ Event-based notification - Subscription Activated (User)
    await notificationService.notifyUser(
      userId,
      NotificationEvent.SUBSCRIPTION_ACTIVATED,
      {
        planName: plan.name,
        gymName: gym.name,
        accessCode: subscription.accessCode
      }
    );

    // ✅ Event-based notification - New Member Added (Gym Owner)
    if (gym.ownerId) {
      await notificationService.notifyUser(
        gym.ownerId,
        NotificationEvent.MEMBER_ADDED,
        {
          memberName: user?.name || 'Unknown User',
          planName: plan.name,
          gymName: gym.name
        }
      );
    }

    return subscription;
  },
};

