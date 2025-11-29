import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

// Ensure env keys exist
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay environment variables: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
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

  // Verify payment signature
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    const payload = `${orderId}|${paymentId}`;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(payload)
      .digest('hex');

    return expected === signature;
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
    const { gymId, userId, source, status, settlementStatus, startDate, endDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (gymId) where.subscription = { ...where.subscription, gymId };
    if (userId) where.subscription = { ...where.subscription, userId };

    if (source) {
      if (source === 'ONLINE') {
        where.subscription = { ...where.subscription, source: { in: ['APP', 'WHATSAPP'] } };
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

    const prisma = new PrismaClient(); // Instantiate here or top level. Top level is better.

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
