import prisma from '../lib/prisma';

export const GymService = {
  async getAllGyms() {
    return prisma.gym.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptionPlans: true,
      },
    });
  },

  async getGymById(id: string) {
    return prisma.gym.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptionPlans: true,
      },
    });
  },

  async createGym(data: { name: string; address?: string; ownerId: string }) {
    return prisma.gym.create({
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async updateGym(id: string, data: Partial<{ name: string; address: string }>) {
    return prisma.gym.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async deleteGym(id: string) {
    return prisma.gym.delete({
      where: { id },
    });
  },
};