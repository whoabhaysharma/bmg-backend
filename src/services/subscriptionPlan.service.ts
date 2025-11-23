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

  async createPlan(data: { gymId: string; name: string; description?: string; durationInMonths: number; price: number }) {
    return prisma.gymSubscriptionPlan.create({
      data,
    });
  },

  async updatePlan(id: string, data: Partial<{ name: string; description: string; durationInMonths: number; price: number }>) {
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