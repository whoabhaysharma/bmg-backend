import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { PaymentStatus } from '@prisma/client';

export interface ProcessPaymentData {
  subscriptionId: string;
  method: string;
}

/**
 * Service class for payment operations
 * Handles payment processing for subscriptions
 * USER can process their own payments
 * OWNER can view payments for their gyms
 */
export class PaymentService {
  /**
   * Process a payment for a subscription
   * Verifies subscription belongs to user before processing
   * In production, would integrate with payment gateway
   * @param userId - User ID processing the payment
   * @param data - Payment processing data
   * @returns Processed payment
   */
  async processPayment(userId: string, data: ProcessPaymentData) {
    const { subscriptionId, method } = data;

    logger.info('Processing payment', { userId, subscriptionId });

    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        payment: true,
        plan: true,
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { userId, subscriptionId });
      throw new Error('Subscription not found');
    }

    if (subscription.payment?.status === PaymentStatus.COMPLETED) {
      logger.warn('Payment already completed', {
        userId,
        subscriptionId,
        paymentId: subscription.payment.id,
      });
      throw new Error('Payment already completed');
    }

    // In a real application, you would integrate with a payment gateway here
    // For now, we'll simulate a successful payment
    const payment = await prisma.payment.update({
      where: {
        subscriptionId,
      },
      data: {
        status: PaymentStatus.COMPLETED,
        method,
      },
    });

    logger.info('Successfully processed payment', {
      userId,
      subscriptionId,
      paymentId: payment.id,
    });

    return payment;
  }

  /**
   * Get payment history for a user
   * @param userId - User ID to fetch payments for
   * @returns List of user's payments with subscription details
   */
  async getUserPayments(userId: string) {
    logger.info('Fetching payment history', { userId });

    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          userId,
        },
      },
      include: {
        subscription: {
          include: {
            gym: {
              select: {
                id: true,
                name: true,
              },
            },
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched payment history', {
      userId,
      count: payments.length,
    });

    return payments;
  }

  /**
   * Get payment history for a gym (OWNER use case)
   * Verifies gym ownership before returning data
   * @param gymId - Gym ID to fetch payments for
   * @param ownerId - Owner ID requesting the data
   * @returns List of payments for the gym
   */
  async getGymPayments(gymId: string, ownerId: string) {
    logger.info('Fetching gym payment history', { userId: ownerId, gymId });

    // Verify gym ownership
    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        ownerId,
      },
    });

    if (!gym) {
      logger.warn('Unauthorized access to gym payment history', {
        userId: ownerId,
        gymId,
      });
      throw new Error("Not authorized to view this gym's payment history");
    }

    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          gymId,
        },
      },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched gym payment history', {
      userId: ownerId,
      gymId,
      count: payments.length,
    });

    return payments;
  }

  /**
   * Get payment by ID
   * @param paymentId - Payment ID to fetch
   * @returns Payment with details or null
   */
  async getPaymentById(paymentId: string) {
    logger.info('Fetching payment', { paymentId });

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            gym: {
              select: {
                id: true,
                name: true,
              },
            },
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      return null;
    }

    return payment;
  }

  /**
   * Update payment status
   * Typically used by webhook handlers from payment gateways
   * @param paymentId - Payment ID to update
   * @param status - New payment status
   * @param method - Payment method (optional)
   */
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    method?: string
  ) {
    logger.info('Updating payment status', { paymentId, status });

    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(method && { method }),
      },
    });

    logger.info('Successfully updated payment status', { paymentId, status });
    return payment;
  }

  /**
   * Mark payment as failed
   * @param paymentId - Payment ID to mark as failed
   */
  async markPaymentFailed(paymentId: string) {
    logger.info('Marking payment as failed', { paymentId });
    return this.updatePaymentStatus(paymentId, PaymentStatus.FAILED);
  }

  /**
   * Get all pending payments
   * Useful for payment processing jobs
   * @returns List of pending payments
   */
  async getPendingPayments() {
    logger.info('Fetching pending payments');

    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
      },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            gym: {
              select: {
                id: true,
                name: true,
              },
            },
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    logger.info(`Found ${payments.length} pending payments`);
    return payments;
  }

  /**
   * Get payment statistics for a gym (OWNER dashboard)
   * @param gymId - Gym ID
   * @param ownerId - Owner ID
   * @returns Payment statistics
   */
  async getGymPaymentStats(gymId: string, ownerId: string) {
    logger.info('Fetching gym payment statistics', { gymId, ownerId });

    // Verify gym ownership
    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        ownerId,
      },
    });

    if (!gym) {
      logger.warn('Unauthorized access to gym payment stats', {
        userId: ownerId,
        gymId,
      });
      throw new Error("Not authorized to view this gym's payment statistics");
    }

    // Get payment statistics
    const stats = await prisma.payment.groupBy({
      by: ['status'],
      where: {
        subscription: {
          gymId,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    // Get total revenue (completed payments)
    const totalRevenue = stats.find(
      (s) => s.status === PaymentStatus.COMPLETED
    )?._sum.amount || 0;

    logger.info('Successfully fetched gym payment statistics', {
      gymId,
      ownerId,
    });

    return {
      stats,
      totalRevenue,
    };
  }

  /**
   * Get all payments for owner across all their gyms
   * Useful for OWNER dashboard overview
   * @param ownerId - Owner ID
   * @returns List of all payments for owner's gyms
   */
  async getOwnerPayments(ownerId: string) {
    logger.info('Fetching owner payment history', { ownerId });

    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          gym: {
            ownerId,
          },
        },
      },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            gym: {
              select: {
                id: true,
                name: true,
              },
            },
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched owner payment history', {
      ownerId,
      count: payments.length,
    });

    return payments;
  }

  /**
   * Handle payment gateway webhook
   * Process webhook events from payment providers
   * @param webhookData - Webhook payload from payment gateway
   */
  async handlePaymentWebhook(webhookData: any) {
    logger.info('Handling payment webhook', { type: webhookData.type });

    // TODO: Implement payment gateway webhook handler
    // 1. Verify webhook signature
    // 2. Parse webhook event type
    // 3. Update payment status based on event
    // 4. Send notifications to relevant users
    // 5. Handle failed payments, refunds, etc.

    logger.info('Payment webhook processed', { type: webhookData.type });
  }
}

export const paymentService = new PaymentService();
