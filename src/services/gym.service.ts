import prisma from '../lib/prisma';
import { SubscriptionStatus, PaymentStatus, NotificationType } from '@prisma/client';
import { notificationService } from './notification.service';

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

    // Notify Owner (Non-blocking)
    try {
      await notificationService.createNotification(
        gym.ownerId,
        status ? 'Gym Verified' : 'Gym Unverified',
        `Your gym "${gym.name}" has been ${status ? 'verified' : 'unverified'} by the admin.`,
        status ? NotificationType.SUCCESS : NotificationType.WARNING
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return gym;
  },

  // Get all gyms
  async getAllGyms() {
    return prisma.gym.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        _count: {
          select: { subscriptions: true },
        },
      },
    });
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

    // Notify Owner (Non-blocking)
    try {
      await notificationService.createNotification(
        gym.ownerId,
        'Gym Created',
        `Your gym "${gym.name}" has been successfully created.`,
        NotificationType.SUCCESS
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }

    return gym;
  },

  // Update gym
  async updateGym(id: string, data: UpdateGymInput) {
    return prisma.gym.update({
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
    return prisma.gym.delete({
      where: { id },
    });
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
