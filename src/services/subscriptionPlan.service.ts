import prisma from '../lib/prisma';
import { PlanType } from '@prisma/client';

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

    return prisma.gymSubscriptionPlan.create({
      data: {
        gymId: data.gymId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        durationValue: data.durationValue,
        durationUnit: unit,
        isActive: true,
      },
    });
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
    return prisma.gymSubscriptionPlan.update({
      where: { id },
      data,
    });
  },

  // Delete plan
  async deletePlan(id: string) {
    return prisma.gymSubscriptionPlan.delete({
      where: { id },
    });
  },
};
