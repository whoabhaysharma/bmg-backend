import prisma from '../lib/prisma';

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
    return prisma.gym.update({
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
    return prisma.gym.create({
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
};
