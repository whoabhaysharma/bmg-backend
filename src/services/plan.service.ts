import prisma from '../lib/prisma';
import logger from '../lib/logger';

export interface CreatePlanData {
  gymId: string;
  name: string;
  description?: string;
  durationInMonths: number;
  price: number;
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  durationInMonths?: number;
  price?: number;
  isActive?: boolean;
}

/**
 * Service class for gym subscription plan operations
 * Only OWNER users can create/update/delete plans for their gyms
 * All users can view plans
 */
export class PlanService {
  /**
   * Create a new subscription plan for a gym
   * Verifies gym ownership before creation
   * @param userId - User ID creating the plan (must be gym owner)
   * @param data - Plan creation data
   * @returns Created plan
   */
  async createPlan(userId: string, data: CreatePlanData) {
    const { gymId, name, description, durationInMonths, price } = data;

    // Verify gym exists and user owns it
    logger.info(`Verifying gym ownership for userId: ${userId}, gymId: ${gymId}`);
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      logger.warn(`Gym not found: ${gymId}`);
      throw new Error('Gym not found');
    }

    if (gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${gymId}`);
      throw new Error('You do not own this gym');
    }

    // Create plan
    logger.info(`Creating plan for gymId: ${gymId}, name: ${name}`);
    const plan = await prisma.gymSubscriptionPlan.create({
      data: {
        gymId,
        name,
        description: description || null,
        durationInMonths,
        price,
      },
    });

    logger.info(`Plan created successfully: ${plan.id}`);
    return plan;
  }

  /**
   * Get all plans for a specific gym
   * @param gymId - Gym ID to fetch plans for
   * @returns List of plans for the gym
   */
  async getPlansByGym(gymId: string) {
    logger.info(`Fetching plans for gymId: ${gymId}`);

    const plans = await prisma.gymSubscriptionPlan.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`Found ${plans.length} plans for gymId: ${gymId}`);
    return plans;
  }

  /**
   * Get only active plans for a gym
   * Used by USER when browsing available subscriptions
   * @param gymId - Gym ID
   * @returns List of active plans
   */
  async getActivePlansByGym(gymId: string) {
    logger.info(`Fetching active plans for gymId: ${gymId}`);

    const plans = await prisma.gymSubscriptionPlan.findMany({
      where: {
        gymId,
        isActive: true,
      },
      orderBy: { durationInMonths: 'asc' },
    });

    logger.info(`Found ${plans.length} active plans for gymId: ${gymId}`);
    return plans;
  }

  /**
   * Get a single plan by ID
   * @param planId - Plan ID to fetch
   * @returns Plan or null if not found
   */
  async getPlanById(planId: string) {
    logger.info(`Fetching plan: ${planId}`);

    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return null;
    }

    logger.info(`Plan found: ${planId}`);
    return plan;
  }

  /**
   * Update a subscription plan
   * Verifies gym ownership before update
   * @param userId - User ID updating the plan (must be gym owner)
   * @param planId - Plan ID to update
   * @param data - Update data
   * @returns Updated plan
   */
  async updatePlan(userId: string, planId: string, data: UpdatePlanData) {
    logger.info(`Fetching plan for update: ${planId}`);

    // Fetch plan with gym info
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      include: { gym: true },
    });

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      throw new Error('Plan not found');
    }

    // Verify gym ownership
    if (plan.gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${plan.gymId}`);
      throw new Error('You do not own this gym');
    }

    // Update plan
    logger.info(`Updating plan: ${planId}`);
    const updatedPlan = await prisma.gymSubscriptionPlan.update({
      where: { id: planId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.durationInMonths !== undefined && {
          durationInMonths: data.durationInMonths,
        }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info(`Plan updated successfully: ${planId}`);
    return updatedPlan;
  }

  /**
   * Delete a subscription plan
   * Verifies gym ownership before deletion
   * @param userId - User ID deleting the plan (must be gym owner)
   * @param planId - Plan ID to delete
   */
  async deletePlan(userId: string, planId: string): Promise<void> {
    logger.info(`Fetching plan for deletion: ${planId}`);

    // Fetch plan with gym info
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      include: { gym: true },
    });

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      throw new Error('Plan not found');
    }

    // Verify gym ownership
    if (plan.gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${plan.gymId}`);
      throw new Error('You do not own this gym');
    }

    // Delete plan
    logger.info(`Deleting plan: ${planId}`);
    await prisma.gymSubscriptionPlan.delete({
      where: { id: planId },
    });

    logger.info(`Plan deleted successfully: ${planId}`);
  }

  /**
   * Deactivate a plan instead of deleting
   * Safer option when there are existing subscriptions
   * @param userId - User ID (must be gym owner)
   * @param planId - Plan ID to deactivate
   */
  async deactivatePlan(userId: string, planId: string) {
    logger.info(`Deactivating plan: ${planId}`);

    return this.updatePlan(userId, planId, { isActive: false });
  }

  /**
   * Activate a previously deactivated plan
   * @param userId - User ID (must be gym owner)
   * @param planId - Plan ID to activate
   */
  async activatePlan(userId: string, planId: string) {
    logger.info(`Activating plan: ${planId}`);

    return this.updatePlan(userId, planId, { isActive: true });
  }

  /**
   * Get all plans owned by a user across all their gyms
   * Useful for OWNER dashboard
   * @param ownerId - Owner user ID
   * @returns List of all plans for owner's gyms
   */
  async getPlansByOwner(ownerId: string) {
    logger.info(`Fetching plans for owner: ${ownerId}`);

    const plans = await prisma.gymSubscriptionPlan.findMany({
      where: {
        gym: {
          ownerId,
        },
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`Found ${plans.length} plans for owner: ${ownerId}`);
    return plans;
  }
}

export const planService = new PlanService();
