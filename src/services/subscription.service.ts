import prisma from '../lib/prisma';
import { PlanType, SubscriptionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

export const SubscriptionService = {
  /**
   * Get all subscriptions (Admin use)
   */
  async getAllSubscriptions() {
    return prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
        gym: true,
        plan: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        gym: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
        payment: true,
      },
    });
  },

  /**
   * Create a new subscription
   */
  async createSubscription(data: {
    userId: string;
    planId: string;
    gymId: string;
  }) {
    // Get the plan to calculate end date
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: data.planId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate end date based on plan duration
    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, plan.durationValue, plan.durationUnit);

    // Generate unique access code
    const accessCode = randomBytes(4).toString('hex').toUpperCase();

    return prisma.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        gymId: data.gymId,
        startDate,
        endDate,
        accessCode,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        plan: true,
        gym: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
      },
    });
  },

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string) {
    return prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
        gym: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get active subscription for user at a specific gym
   */
  async getActiveUserSubscription(userId: string, gymId: string) {
    return prisma.subscription.findFirst({
      where: {
        userId,
        gymId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: new Date() },
      },
      include: {
        plan: true,
        gym: true,
      },
    });
  },

  /**
   * Get all subscriptions for a gym (owner view)
   */
  async getGymSubscriptions(gymId: string) {
    return prisma.subscription.findMany({
      where: { gymId },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(id: string, status: SubscriptionStatus) {
    return prisma.subscription.update({
      where: { id },
      data: { status },
      include: {
        plan: true,
        gym: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
      },
    });
  },

  /**
   * Update last check-in time
   */
  async updateLastCheckIn(id: string, checkInTime?: Date) {
    return prisma.subscription.update({
      where: { id },
      data: { lastCheckIn: checkInTime || new Date() },
    });
  },

  /**
   * Get subscription by access code
   */
  async getSubscriptionByAccessCode(accessCode: string) {
    return prisma.subscription.findUnique({
      where: { accessCode },
      include: {
        plan: true,
        gym: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
      },
    });
  },

  /**
   * Check if subscription is valid for gym access
   */
  async isSubscriptionValid(subscriptionId: string): Promise<boolean> {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) return false;

    const now = new Date();
    return (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.endDate >= now
    );
  },

  /**
   * Get expiring subscriptions (within next 7 days)
   */
  async getExpiringSubscriptions(gymId?: string) {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return prisma.subscription.findMany({
      where: {
        ...(gymId && { gymId }),
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lte: sevenDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        plan: true,
        gym: true,
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
      },
    });
  },

  /**
   * Mark expired subscriptions
   */
  async markExpiredSubscriptions() {
    const now = new Date();
    
    return prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { lt: now },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });
  },

  /**
   * Calculate end date based on duration value and unit
   */
  calculateEndDate(startDate: Date, durationValue: number, durationUnit: PlanType): Date {
    const endDate = new Date(startDate);

    switch (durationUnit) {
      case PlanType.DAY:
        endDate.setDate(endDate.getDate() + durationValue);
        break;
      case PlanType.WEEK:
        endDate.setDate(endDate.getDate() + (durationValue * 7));
        break;
      case PlanType.MONTH:
        endDate.setMonth(endDate.getMonth() + durationValue);
        break;
      case PlanType.YEAR:
        endDate.setFullYear(endDate.getFullYear() + durationValue);
        break;
      default:
        throw new Error('Invalid duration unit');
    }

    return endDate;
  },

  /**
   * Delete subscription (soft delete could be implemented)
   */
  async deleteSubscription(id: string) {
    return prisma.subscription.delete({
      where: { id },
    });
  },
};