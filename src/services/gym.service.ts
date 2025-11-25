import prisma from '../lib/prisma';

// Define strict types for inputs to avoid "any" types
export interface CreateGymInput {
  name: string;
  address?: string;
  ownerId: string;
}

export interface UpdateGymInput {
  name?: string;
  address?: string;
}

/**
 * Toggle gym verification status (Admin/System only)
 */
export const setGymVerified = async (id: string, status: boolean) => {
  return prisma.gym.update({
    where: { id },
    data: {
      verified: status // Strictly assign the boolean
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          mobileNumber: true, // Added mobile in case you need to notify them
        },
      },
      subscriptionPlans: true,
    },
  });
};

/**
 * Get all gyms with relations
 */
export const getAllGyms = async () => {
  return prisma.gym.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { subscriptions: true } // Useful for dashboards
      }
    },
  });
};

/**
 * Get a single gym by ID
 */
export const getGymById = async (id: string) => {
  return prisma.gym.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      subscriptionPlans: {
        where: { isActive: true } // Usually only want active plans
      },
    },
  });
};

/**
 * Create a new gym
 */
export const createGym = async (data: CreateGymInput) => {
  return prisma.gym.create({
    data: {
      name: data.name,
      address: data.address,
      verified: false, // Explicitly default to false
      owner: {
        connect: { id: data.ownerId } // Standard Prisma relation syntax
      }
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

/**
 * Update gym details (Name, Address)
 * Note: We deliberately exclude 'verified' here for security
 */
export const updateGym = async (id: string, data: UpdateGymInput) => {
  return prisma.gym.update({
    where: { id },
    data: {
      name: data.name,
      address: data.address
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

/**
 * Get gyms owned by a specific user
 */
export const getGymsByOwner = async (ownerId: string) => {
  return prisma.gym.findMany({
    where: { ownerId },
    include: {
      subscriptionPlans: true,
      _count: { select: { subscriptions: true } }
    }
  });
};

/**
 * Delete a gym
 */
export const deleteGym = async (id: string) => {
  return prisma.gym.delete({
    where: { id },
  });
};
