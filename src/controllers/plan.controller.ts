import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AuthenticatedRequest } from '../types/api.types';

// Create a new subscription plan
export const createPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { gymId, name, description, durationInMonths, price } = req.body;

    if (!gymId || !name || !durationInMonths || price === undefined) {
      logger.warn('Missing required fields for plan creation');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: gymId, name, durationInMonths, price',
      });
    }

    // Verify user owns the gym
    logger.info(
      `Verifying gym ownership for userId: ${userId}, gymId: ${gymId}`
    );
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
    });

    if (!gym) {
      logger.warn(`Gym not found: ${gymId}`);
      return res.status(404).json({
        success: false,
        error: 'Gym not found',
      });
    }

    if (gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${gymId}`);
      return res.status(403).json({
        success: false,
        error: 'You do not own this gym',
      });
    }

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
    return res.status(201).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error(`Error creating plan: ${error}`);
    next(error);
  }
};

// Get all plans for a gym
export const getPlansByGym = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gymId } = req.params;

    if (!gymId) {
      logger.warn('gymId is required');
      return res.status(400).json({
        success: false,
        error: 'gymId is required',
      });
    }

    logger.info(`Fetching plans for gymId: ${gymId}`);
    const plans = await prisma.gymSubscriptionPlan.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`Found ${plans.length} plans for gymId: ${gymId}`);
    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error(`Error fetching plans: ${error}`);
    next(error);
  }
};

// Get a single plan by ID
export const getPlanById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      logger.warn('planId is required');
      return res.status(400).json({
        success: false,
        error: 'planId is required',
      });
    }

    logger.info(`Fetching plan: ${planId}`);
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    logger.info(`Plan found: ${planId}`);
    return res.status(200).json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error(`Error fetching plan: ${error}`);
    next(error);
  }
};

// Update a plan
export const updatePlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;
    const { name, description, durationInMonths, price, isActive } = req.body;

    if (!planId) {
      logger.warn('planId is required');
      return res.status(400).json({
        success: false,
        error: 'planId is required',
      });
    }

    logger.info(`Fetching plan for update: ${planId}`);
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      include: { gym: true },
    });

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    // Verify user owns the gym
    if (plan.gym.ownerId !== userId) {
      logger.warn(
        `Unauthorized: User ${userId} does not own gym ${plan.gymId}`
      );
      return res.status(403).json({
        success: false,
        error: 'You do not own this gym',
      });
    }

    logger.info(`Updating plan: ${planId}`);
    const updatedPlan = await prisma.gymSubscriptionPlan.update({
      where: { id: planId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(durationInMonths && { durationInMonths }),
        ...(price !== undefined && { price }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    logger.info(`Plan updated successfully: ${planId}`);
    return res.status(200).json({
      success: true,
      data: updatedPlan,
    });
  } catch (error) {
    logger.error(`Error updating plan: ${error}`);
    next(error);
  }
};

// Delete a plan
export const deletePlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;

    if (!planId) {
      logger.warn('planId is required');
      return res.status(400).json({
        success: false,
        error: 'planId is required',
      });
    }

    logger.info(`Fetching plan for deletion: ${planId}`);
    const plan = await prisma.gymSubscriptionPlan.findUnique({
      where: { id: planId },
      include: { gym: true },
    });

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    // Verify user owns the gym
    if (plan.gym.ownerId !== userId) {
      logger.warn(
        `Unauthorized: User ${userId} does not own gym ${plan.gymId}`
      );
      return res.status(403).json({
        success: false,
        error: 'You do not own this gym',
      });
    }

    logger.info(`Deleting plan: ${planId}`);
    await prisma.gymSubscriptionPlan.delete({
      where: { id: planId },
    });

    logger.info(`Plan deleted successfully: ${planId}`);
    return res.status(200).json({
      success: true,
      data: { message: 'Plan deleted successfully' },
    });
  } catch (error) {
    logger.error(`Error deleting plan: ${error}`);
    next(error);
  }
};

// Get all active plans for a gym
export const getActivePlansByGym = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { gymId } = req.params;

    if (!gymId) {
      logger.warn('gymId is required');
      return res.status(400).json({
        success: false,
        error: 'gymId is required',
      });
    }

    logger.info(`Fetching active plans for gymId: ${gymId}`);
    const plans = await prisma.gymSubscriptionPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { durationInMonths: 'asc' },
    });

    logger.info(`Found ${plans.length} active plans for gymId: ${gymId}`);
    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error(`Error fetching active plans: ${error}`);
    next(error);
  }
};
