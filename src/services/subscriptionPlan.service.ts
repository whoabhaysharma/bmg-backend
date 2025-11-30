import prisma from '../lib/prisma';
import { PlanType } from '@prisma/client';
import { notificationService } from './notification.service';
import { NotificationEvent } from '../types/notification-events';

export const subscriptionPlanService = {
  // Get all plans (admin)
  async getAllPlans() {
    return prisma.gymSubscriptionPlan.findMany({
      include: {
        gym: true,
        subscriptions: true,
      },
    });
  },

  // Get plan by id
  async getPlanById(id: string) {
    return prisma.gymSubscriptionPlan.findUnique({
      where: { id },
      include: {
        gym: true,
        subscriptions: true,
      },
    });
  },

  // Plans for a gym (owner)
  async getPlansByGym(gymId: string) {
    return prisma.gymSubscriptionPlan.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });
  },

  // Public active plans
  async getActivePlansByGym(gymId: string) {
    return prisma.gymSubscriptionPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { price: 'asc' },
    });
  },

  // Create plan
  async createPlan(data: {
    gymId: string;
    name: string;
    description?: string;
    price: number;
    durationValue: number;
    durationUnit?: PlanType;
  }) {
    if (!Number.isInteger(data.durationValue) || data.durationValue <= 0) {
      throw new Error('durationValue must be a positive integer');
    }

    const unit = data.durationUnit ?? PlanType.MONTH;

    const plan = await prisma.gymSubscriptionPlan.create({
      data: {
        gymId: data.gymId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        durationValue: data.durationValue,
        durationUnit: unit,
        isActive: true,
      },
      include: {
        gym: {
          select: { ownerId: true, name: true }
        }
      }
    });

    // ✅ New event-based notification
    await notificationService.notifyUser(
      plan.gym.ownerId,
      NotificationEvent.PLAN_CREATED,
      {
        planName: plan.name,
        gymName: plan.gym.name,
        price: plan.price
      }
    );

    return plan;
  },

  // Update plan
  async updatePlan(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      isActive: boolean;
      durationValue: number;
      durationUnit: PlanType;
    }>
  ) {
    const plan = await prisma.gymSubscriptionPlan.update({
      where: { id },
      data,
      include: {
        gym: {
          select: { ownerId: true, name: true }
        }
      }
    });

    // ✅ Notify owner about plan update
    await notificationService.notifyUser(
      plan.gym.ownerId,
      NotificationEvent.PLAN_UPDATED,
      {
        planName: plan.name,
        gymName: plan.gym.name
      }
    );

    // ✅ Notify about activation/deactivation if status changed
    if (data.isActive !== undefined) {
      await notificationService.notifyUser(
        plan.gym.ownerId,
        data.isActive ? NotificationEvent.PLAN_ACTIVATED : NotificationEvent.PLAN_DEACTIVATED,
        {
          planName: plan.name,
          gymName: plan.gym.name
        }
      );
    }

    return plan;
  },

  // Delete plan
  async deletePlan(id: string) {
    // Get plan details before deletion for notification
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id },
      include: {
        gym: {
          select: { ownerId: true, name: true }
        }
      }
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    const deleted = await prisma.gymSubscriptionPlan.delete({
      where: { id },
    });

    // ✅ Notify owner about plan deletion
    await notificationService.notifyUser(
      plan.gym.ownerId,
      NotificationEvent.PLAN_DELETED,
      {
        planName: plan.name,
        gymName: plan.gym.name
      }
    );

    return deleted;
  },
};

