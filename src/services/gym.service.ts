import prisma from '../lib/prisma';
import logger from '../lib/logger';

export interface CreateGymData {
  name: string;
  address?: string;
  ownerId: string;
}

export interface UpdateGymData {
  name?: string;
  address?: string;
}

export interface GymWithOwner {
  id: string;
  name: string;
  address: string | null;
  ownerId: string;
  owner: {
    id: string;
    name: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GymWithDetails extends GymWithOwner {
  subscriptionPlans: any[];
}

/**
 * Service class for gym management operations
 * Handles gym CRUD operations with ownership validation
 * Only OWNER role users can create and manage gyms
 */
export class GymService {
  /**
   * Create a new gym
   * Only users with OWNER role can create gyms
   * @param data - Gym creation data including name, address, and owner ID
   * @returns Created gym
   */
  async createGym(data: CreateGymData) {
    const { name, address, ownerId } = data;

    logger.info(`Creating gym for owner: ${ownerId}`);

    const gym = await prisma.gym.create({
      data: {
        name,
        address: address || null,
        ownerId,
      },
    });

    logger.info(`Successfully created gym with id: ${gym.id}`);
    return gym;
  }

  /**
   * Get all gyms with owner information
   * Accessible to all user types (ADMIN, OWNER, USER)
   * @returns List of all gyms
   */
  async getAllGyms(): Promise<GymWithOwner[]> {
    logger.info('Fetching all gyms');

    const gyms = await prisma.gym.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Successfully fetched ${gyms.length} gyms`);
    return gyms;
  }

  /**
   * Get gym by ID with owner and subscription plans
   * @param gymId - Gym ID to fetch
   * @returns Gym with details or null if not found
   */
  async getGymById(gymId: string): Promise<GymWithDetails | null> {
    logger.info(`Fetching gym with id: ${gymId}`);

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
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

    if (!gym) {
      logger.warn(`Gym not found with id: ${gymId}`);
      return null;
    }

    logger.info(`Successfully fetched gym with id: ${gymId}`);
    return gym;
  }

  /**
   * Get gyms owned by a specific user
   * Useful for OWNER users to see their gyms
   * @param ownerId - Owner user ID
   * @returns List of gyms owned by the user
   */
  async getGymsByOwner(ownerId: string): Promise<GymWithOwner[]> {
    logger.info(`Fetching gyms for owner: ${ownerId}`);

    const gyms = await prisma.gym.findMany({
      where: { ownerId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Found ${gyms.length} gyms for owner: ${ownerId}`);
    return gyms;
  }

  /**
   * Update gym information
   * Validates that the user is the owner before allowing update
   * @param gymId - Gym ID to update
   * @param ownerId - Owner ID attempting the update
   * @param data - Update data
   * @returns Updated gym or null if not found/unauthorized
   */
  async updateGym(
    gymId: string,
    ownerId: string,
    data: UpdateGymData
  ): Promise<any> {
    logger.info(`Updating gym with id: ${gymId}`, { userId: ownerId });

    // Check gym exists and verify ownership
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      logger.warn(`Gym not found with id: ${gymId}`);
      throw new Error('Gym not found');
    }

    if (gym.ownerId !== ownerId) {
      logger.warn(
        `User ${ownerId} is not authorized to update gym with id: ${gymId}`
      );
      throw new Error('You are not authorized to update this gym');
    }

    // Update gym
    const updatedGym = await prisma.gym.update({
      where: { id: gymId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
      },
    });

    logger.info(`Successfully updated gym with id: ${gymId}`);
    return updatedGym;
  }

  /**
   * Delete a gym
   * Validates that the user is the owner before allowing deletion
   * Cascades to related subscription plans, subscriptions, and attendance logs
   * @param gymId - Gym ID to delete
   * @param ownerId - Owner ID attempting the deletion
   */
  async deleteGym(gymId: string, ownerId: string): Promise<void> {
    logger.info(`Deleting gym with id: ${gymId}`, { userId: ownerId });

    // Check gym exists and verify ownership
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      logger.warn(`Gym not found with id: ${gymId}`);
      throw new Error('Gym not found');
    }

    if (gym.ownerId !== ownerId) {
      logger.warn(
        `User ${ownerId} is not authorized to delete gym with id: ${gymId}`
      );
      throw new Error('You are not authorized to delete this gym');
    }

    // Delete gym (cascades to related records)
    await prisma.gym.delete({
      where: { id: gymId },
    });

    logger.info(`Successfully deleted gym with id: ${gymId}`);
  }

  /**
   * Verify gym ownership
   * @param gymId - Gym ID to check
   * @param userId - User ID to verify as owner
   * @returns True if user owns the gym
   */
  async verifyOwnership(gymId: string, userId: string): Promise<boolean> {
    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        ownerId: userId,
      },
    });

    return !!gym;
  }

  /**
   * Get gym with subscriber count
   * Useful for OWNER to see gym statistics
   * @param gymId - Gym ID
   * @returns Gym with subscriber count
   */
  async getGymWithStats(gymId: string) {
    logger.info(`Fetching gym stats for: ${gymId}`);

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptionPlans: {
          where: { isActive: true },
        },
        _count: {
          select: {
            subscribers: true,
            attendanceLogs: true,
          },
        },
      },
    });

    if (!gym) {
      return null;
    }

    logger.info(`Successfully fetched gym stats for: ${gymId}`);
    return gym;
  }
}

export const gymService = new GymService();
