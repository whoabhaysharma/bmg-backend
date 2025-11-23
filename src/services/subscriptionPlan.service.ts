import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SubscriptionPlanService = {
  async getAllPlans() {
    return prisma.gymSubscriptionPlan.findMany({
      include: {
        gym: true,
        subscriptions: true,
      },
    });
  },

  async getPlanById(id: string) {
    return prisma.gymSubscriptionPlan.findUnique({
      where: { id },
      include: {
        gym: true,
        subscriptions: true,
      },
    });
  },

  async getPlansByGym(gymId: string) {
    return prisma.gymSubscriptionPlan.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getActivePlansByGym(gymId: string) {
    return prisma.gymSubscriptionPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { durationInMonths: 'asc' },
    });
  },

  async createPlan(data: { gymId: string; name: string; description?: string; durationInMonths: number; price: number }) {
    return prisma.gymSubscriptionPlan.create({
      data: {
        ...data,
        description: data.description || null,
      },
    });
  },

  async updatePlan(id: string, data: Partial<{ name: string; description: string; durationInMonths: number; price: number; isActive: boolean }>) {
    return prisma.gymSubscriptionPlan.update({
      where: { id },
      data,
    });
  },

  async deletePlan(id: string) {
    return prisma.gymSubscriptionPlan.delete({
      where: { id },
    });
  },
};