import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { notificationService } from './notification.service';
import { NotificationEvent } from '../types/notification-events';

// Ensure env keys exist
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error(
    'Missing Razorpay environment variables: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.'
  );
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const paymentService = {
  // Create Razorpay order
  async createOrder(amount: number, receipt: string, currency = 'INR') {
    const amountInPaise = Math.round(amount * 100);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const order = await (razorpay as any).orders.create({
        amount: amountInPaise,
        currency,
        receipt,
      });

      return order;
    } catch (err) {
      console.error('Razorpay Order Creation Error:', err);
      throw new Error('PAYMENT_SERVICE_ERROR: Failed to create payment order');
    }
  },

  // Create Razorpay Payment Link
  async createPaymentLink(
    amount: number,
    description: string,
    customer: { name: string; contact: string; email?: string },
    referenceId: string
  ) {
    const amountInPaise = Math.round(amount * 100);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const link = await (razorpay as any).paymentLink.create({
        amount: amountInPaise,
        currency: 'INR',
        accept_partial: false,
        description,
        customer,
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: {
          referenceId,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`, // You might want a specific success page
        callback_method: 'get',
      });

      return link;
    } catch (err) {
      console.error('Razorpay Payment Link Creation Error:', err);
      throw new Error('PAYMENT_SERVICE_ERROR: Failed to create payment link');
    }
  },

  // Verify payment signature
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ) {
    const payload = `${orderId}|${paymentId}`;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(payload)
      .digest('hex');

    return expected === signature;
  },

  // Handle payment failure
  async handlePaymentFailure(razorpayOrderId: string, reason?: string) {
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: {
        subscription: {
          include: {
            plan: true,
            user: true,
          },
        },
      },
    });

    if (!payment) return;

    // Update payment status to failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });

    // ✅ Event-based notification - Payment Failed
    await notificationService.notifyUser(
      payment.subscription.userId,
      NotificationEvent.PAYMENT_FAILED,
      {
        amount: payment.amount,
        planName: payment.subscription.plan.name,
        reason: reason || 'Payment verification failed'
      }
    );
  },

  // Get All Payments (Admin/Owner view)
  async getAllPayments(filters: {
    gymId?: string;
    userId?: string;
    source?: 'ONLINE' | 'MANUAL'; // Derived from SubscriptionSource
    status?: string; // PaymentStatus
    settlementStatus?: 'SETTLED' | 'UNSETTLED';
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      gymId,
      userId,
      source,
      status,
      settlementStatus,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = filters;
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (gymId) where.subscription = { ...where.subscription, gymId };
    if (userId) where.subscription = { ...where.subscription, userId };

    if (source) {
      if (source === 'ONLINE') {
        where.subscription = {
          ...where.subscription,
          source: { in: ['APP', 'WHATSAPP'] },
        };
      } else {
        where.subscription = { ...where.subscription, source: 'CONSOLE' };
      }
    }

    if (status) where.status = status;

    if (settlementStatus) {
      if (settlementStatus === 'SETTLED') {
        where.settlementId = { not: null };
      } else {
        where.settlementId = null;
        // Usually we only care about UNSETTLED for Online payments
        if (!source || source === 'ONLINE') {
          // If looking for unsettled, implicitly we might mean online ones, but let's stick to strict filter
        }
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // const prisma = new PrismaClient(); // Removed local instantiation

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              user: { select: { name: true, mobileNumber: true } },
              plan: { select: { name: true } },
              gym: { select: { name: true } },
            },
          },
          settlement: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};

