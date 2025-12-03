import prisma from '../lib/prisma';
import { SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { notificationService } from './notification.service';
import { NotificationEvent } from '../types/notification-events';

export interface CreateGymInput {
  name: string;
  address?: string;
  ownerId: string;
}

export interface UpdateGymInput {
  name?: string;
  address?: string;
}

export const gymService = {
  // Toggle gym verification status
  async setGymVerified(id: string, status: boolean) {
    const gym = await prisma.gym.update({
      where: { id },
      data: { verified: status },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          },
        },
        subscriptionPlans: true,
      },
    });

    // ✅ Event-based notification
    await notificationService.notifyUser(
      gym.ownerId,
      status ? NotificationEvent.GYM_VERIFIED : NotificationEvent.GYM_UNVERIFIED,
      { gymName: gym.name }
    );

    return gym;
  },

  // Get all gyms
  async getAllGyms(filters: {
    ownerId?: string;
    verified?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { ownerId, verified, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (ownerId) where.ownerId = ownerId;
    if (verified !== undefined) where.verified = verified;

    const [gyms, total] = await Promise.all([
      prisma.gym.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, name: true },
          },
          _count: {
            select: { subscriptions: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.gym.count({ where }),
    ]);

    return {
      data: gyms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Get gym by ID
  async getGymById(id: string) {
    return prisma.gym.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        subscriptionPlans: {
          where: { isActive: true },
        },
      },
    });
  },

  // Create gym
  async createGym(data: CreateGymInput) {
    const gym = await prisma.gym.create({
      data: {
        name: data.name,
        address: data.address,
        verified: false,
        owner: {
          connect: { id: data.ownerId },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    // ✅ Event-based notification
    await notificationService.notifyUser(
      gym.ownerId,
      NotificationEvent.GYM_CREATED,
      { gymName: gym.name }
    );

    return gym;
  },

  // Update gym
  async updateGym(id: string, data: UpdateGymInput) {
    const gym = await prisma.gym.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
      },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    // ✅ Event-based notification
    await notificationService.notifyUser(
      gym.ownerId,
      NotificationEvent.GYM_UPDATED,
      { gymName: gym.name }
    );

    return gym;
  },

  // Gyms by owner
  async getGymsByOwner(ownerId: string) {
    return prisma.gym.findMany({
      where: { ownerId },
      include: {
        subscriptionPlans: true,
        _count: { select: { subscriptions: true } },
      },
    });
  },

  // Delete gym
  async deleteGym(id: string) {
    // Get gym details before deletion for notification
    const gym = await prisma.gym.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true },
        },
      },
    });

    if (!gym) {
      throw new Error('Gym not found');
    }

    const deleted = await prisma.gym.delete({
      where: { id },
    });

    // ✅ Event-based notification
    await notificationService.notifyUser(
      gym.ownerId,
      NotificationEvent.GYM_DELETED,
      { gymName: gym.name }
    );

    return deleted;
  },

  // Get gym stats
  async getGymStats(gymId: string) {
    const [activeMembers, totalRevenue, recentActivity] = await Promise.all([
      // 1. Active Members
      prisma.subscription.count({
        where: {
          gymId,
          status: SubscriptionStatus.ACTIVE,
        },
      }),

      // 2. Total Revenue (Sum of completed payments)
      prisma.payment.aggregate({
        where: {
          subscription: {
            gymId,
          },
          status: PaymentStatus.COMPLETED,
        },
        _sum: {
          amount: true,
        },
      }),

      // 3. Recent Activity (Recent subscriptions)
      prisma.subscription.findMany({
        where: { gymId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          plan: { select: { name: true, price: true } },
        },
      }),
    ]);

    return {
      activeMembers,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentActivity: recentActivity.map((sub) => ({
        id: sub.id,
        title: 'New Subscription',
        description: `${sub.user.name} subscribed to ${sub.plan.name}`,
        amount: sub.plan.price,
        time: sub.createdAt,
      })),
    };
  },
};

