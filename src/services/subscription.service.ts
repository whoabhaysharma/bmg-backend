import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SubscriptionService = {
  async getAllSubscriptions() {
    return prisma.subscription.findMany({
      include: {
        user: true,
        gym: true,
        plan: true,
        payment: true,
      },
    });
  },

  async getSubscriptionById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: {
        user: true,
        gym: true,
        plan: true,
        payment: true,
      },
    });
  },

  async createSubscription(data: { userId: string; gymId: string; planId: string; startDate: Date; endDate: Date; status: string }) {
    return prisma.subscription.create({
      data,
    });
  },

  async updateSubscription(id: string, data: Partial<{ startDate: Date; endDate: Date; status: string }>) {
    return prisma.subscription.update({
      where: { id },
      data,
    });
  },

  async deleteSubscription(id: string) {
    return prisma.subscription.delete({
      where: { id },
    });
  },
};