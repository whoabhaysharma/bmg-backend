import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GymService = {
  async getAllGyms() {
    return prisma.gym.findMany({
      include: {
        owner: true,
        subscriptionPlans: true,
      },
    });
  },

  async getGymById(id: string) {
    return prisma.gym.findUnique({
      where: { id },
      include: {
        owner: true,
        subscriptionPlans: true,
      },
    });
  },

  async createGym(data: { name: string; address?: string; ownerId: string }) {
    return prisma.gym.create({
      data,
    });
  },

  async updateGym(id: string, data: Partial<{ name: string; address: string }>) {
    return prisma.gym.update({
      where: { id },
      data,
    });
  },

  async deleteGym(id: string) {
    return prisma.gym.delete({
      where: { id },
    });
  },
};