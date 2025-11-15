import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { SubscriptionStatus } from '@prisma/client';

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  gymId: string;
}

/**
 * Service class for subscription management
 * Handles subscription lifecycle for USER role
 * OWNER can view subscriptions for their gyms
 */
export class SubscriptionService {
  /**
   * Get all subscriptions for a user
   * @param userId - User ID to fetch subscriptions for
   * @returns List of user's subscriptions with gym and plan details
   */
  async getUserSubscriptions(userId: string) {
    logger.info('Fetching user subscriptions', { userId });

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: true,
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            method: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched subscriptions', {
      userId,
      count: subscriptions.length,
    });

    return subscriptions;
  }

  /**
   * Get active subscriptions for a user at a specific gym
   * @param userId - User ID
   * @param gymId - Gym ID
   * @returns Active subscription or null
   */
  async getActiveSubscription(userId: string, gymId: string) {
    return await prisma.subscription.findFirst({
      where: {
        userId,
        gymId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: true,
        payment: true,
      },
    });
  }

  /**
   * Get all subscribers for a gym (OWNER use case)
   * @param gymId - Gym ID to fetch subscribers for
   * @returns List of subscriptions for the gym
   */
  async getGymSubscribers(gymId: string) {
    logger.info('Fetching gym subscribers', { gymId });

    const subscriptions = await prisma.subscription.findMany({
      where: { gymId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        },
        plan: true,
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched gym subscribers', {
      gymId,
      count: subscriptions.length,
    });

    return subscriptions;
  }

  /**
   * Create a new subscription
   * Checks for existing active subscriptions and creates payment record
   * @param data - Subscription creation data
   * @returns Created subscription with gym and plan details
   */
  async createSubscription(data: CreateSubscriptionData) {
    const { userId, planId, gymId } = data;

    logger.info('Creating subscription', { userId, planId, gymId });

    // Check if user already has an active subscription for this gym
    const existingSubscription = await this.getActiveSubscription(userId, gymId);

    if (existingSubscription) {
      logger.warn('Active subscription already exists', {
        userId,
        gymId,
        subscriptionId: existingSubscription.id,
      });
      throw new Error('You already have an active subscription for this gym');
    }

    // Get plan to calculate end date and price
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      logger.warn('Plan not found', { planId });
      throw new Error('Subscription plan not found');
    }

    if (!plan.isActive) {
      logger.warn('Plan is not active', { planId });
      throw new Error('This subscription plan is no longer active');
    }

    // Calculate end date based on plan duration
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.durationInMonths);

    // Create subscription and payment record in a transaction
    const subscription = await prisma.$transaction(async (tx) => {
      // Create subscription
      const sub = await tx.subscription.create({
        data: {
          userId,
          planId,
          gymId,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
        include: {
          gym: {
            select: {
              id: true,
              name: true,
            },
          },
          plan: true,
        },
      });

      // Create pending payment record with plan price
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          status: 'PENDING',
          amount: plan.price,
          method: 'PENDING', // Will be updated during payment processing
        },
      });

      return sub;
    });

    logger.info('Successfully created subscription', {
      userId,
      subscriptionId: subscription.id,
      gymId,
      planId,
    });

    return subscription;
  }

  /**
   * Cancel a subscription
   * Verifies user owns the subscription before cancelling
   * @param userId - User ID cancelling the subscription
   * @param subscriptionId - Subscription ID to cancel
   * @returns Updated subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    logger.info('Canceling subscription', { userId, subscriptionId });

    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        payment: true,
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { userId, subscriptionId });
      throw new Error('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      logger.warn('Subscription already cancelled', {
        userId,
        subscriptionId,
      });
      throw new Error('Subscription is already cancelled');
    }

    // Update subscription status
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        endDate: new Date(), // Set end date to now when cancelling
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: true,
      },
    });

    logger.info('Successfully cancelled subscription', {
      userId,
      subscriptionId,
    });

    return updatedSubscription;
  }

  /**
   * Verify user has active subscription to a gym
   * Used for access control (e.g., check-in validation)
   * @param userId - User ID
   * @param gymId - Gym ID
   * @returns True if user has active subscription
   */
  async hasActiveSubscription(userId: string, gymId: string): Promise<boolean> {
    const subscription = await this.getActiveSubscription(userId, gymId);
    return !!subscription;
  }

  /**
   * Update subscription status (typically for expiration handling)
   * @param subscriptionId - Subscription ID
   * @param status - New status
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus
  ) {
    logger.info('Updating subscription status', { subscriptionId, status });

    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status },
    });

    logger.info('Successfully updated subscription status', {
      subscriptionId,
      status,
    });

    return subscription;
  }

  /**
   * Get expired subscriptions that need status update
   * Used by background jobs/cron tasks
   * @returns List of expired subscriptions
   */
  async getExpiredSubscriptions() {
    logger.info('Fetching expired subscriptions');

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Found ${subscriptions.length} expired subscriptions`);
    return subscriptions;
  }

  /**
   * Mark expired subscriptions as EXPIRED
   * Should be called periodically by a background job
   * @returns Count of updated subscriptions
   */
  async markExpiredSubscriptions(): Promise<number> {
    logger.info('Marking expired subscriptions');

    const result = await prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lt: new Date(),
        },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    logger.info(`Marked ${result.count} subscriptions as expired`);
    return result.count;
  }

  /**
   * Get subscription by ID
   * @param subscriptionId - Subscription ID
   * @returns Subscription with details or null
   */
  async getSubscriptionById(subscriptionId: string) {
    logger.info('Fetching subscription', { subscriptionId });

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: true,
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { subscriptionId });
      return null;
    }

    return subscription;
  }
}

export const subscriptionService = new SubscriptionService();
