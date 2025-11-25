import { Request, Response } from 'express';
import logger from '../lib/logger';
import { AuthenticatedRequest } from '../types/api.types';
import { SubscriptionPlanService, GymService } from '../services';
import { sendSuccess, sendBadRequest, sendNotFound, sendForbidden, sendInternalError } from '../utils/response';

// Create a new subscription plan
export const createPlan = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { gymId, name, description, durationValue, durationUnit, price } = req.body;

    if (!gymId || !name || durationValue === undefined || price === undefined) {
      logger.warn('Missing required fields for plan creation');
      return sendBadRequest(res, 'Missing required fields: gymId, name, durationValue, price');
    }

    // Validate durationValue is a positive integer
    const parsedDuration = Number(durationValue);
    if (!Number.isFinite(parsedDuration) || !Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      logger.warn(`Invalid durationValue provided: ${durationValue}`);
      return sendBadRequest(res, 'durationValue must be a positive integer');
    }

    // Verify user owns the gym
    logger.info(`Verifying gym ownership for userId: ${userId}, gymId: ${gymId}`);
    const gym = await GymService.getGymById(gymId);

    if (!gym) {
      logger.warn(`Gym not found: ${gymId}`);
      return sendNotFound(res, 'Gym not found');
    }

    if (gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${gymId}`);
      return sendForbidden(res, 'You do not own this gym');
    }

    logger.info(`Creating plan for gymId: ${gymId}, name: ${name}`);
    const plan = await SubscriptionPlanService.createPlan({
      gymId,
      name,
      description,
      durationValue: parsedDuration,
      durationUnit,
      price,
    });

    logger.info(`Plan created successfully: ${plan.id}`);
    return sendSuccess(res, plan, 201);
  } catch (error) {
    logger.error(`Error creating plan: ${error}`);
    return sendInternalError(res, 'Failed to create plan');
  }
};

// Get all plans for a gym
export const getPlansByGym = async (
  req: Request,
  res: Response
) => {
  try {
    const { gymId } = req.query;

    if (!gymId || typeof gymId !== 'string') {
      logger.warn('gymId is required');
      return sendBadRequest(res, 'gymId is required');
    }

    logger.info(`Fetching plans for gymId: ${gymId}`);
    const plans = await SubscriptionPlanService.getPlansByGym(gymId);

    logger.info(`Found ${plans.length} plans for gymId: ${gymId}`);
    return sendSuccess(res, plans);
  } catch (error) {
    logger.error(`Error fetching plans: ${error}`);
    return sendInternalError(res, 'Failed to fetch plans');
  }
};

// Get a single plan by ID
export const getPlanById = async (
  req: Request,
  res: Response
) => {
  try {
    const { planId } = req.params;

    if (!planId) {
      logger.warn('planId is required');
      return sendBadRequest(res, 'planId is required');
    }

    logger.info(`Fetching plan: ${planId}`);
    const plan = await SubscriptionPlanService.getPlanById(planId);

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return sendNotFound(res, 'Plan not found');
    }

    logger.info(`Plan found: ${planId}`);
    return sendSuccess(res, plan);
  } catch (error) {
    logger.error(`Error fetching plan: ${error}`);
    return sendInternalError(res, 'Failed to fetch plan');
  }
};

// Update a plan
export const updatePlan = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;
    const { name, description, durationValue, durationUnit, price, isActive } = req.body;

    if (!planId) {
      logger.warn('planId is required');
      return sendBadRequest(res, 'planId is required');
    }

    logger.info(`Fetching plan for update: ${planId}`);
    const plan = await SubscriptionPlanService.getPlanById(planId);

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return sendNotFound(res, 'Plan not found');
    }

    // Verify user owns the gym
    if (plan.gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${plan.gymId}`);
      return sendForbidden(res, 'You do not own this gym');
    }

    logger.info(`Updating plan: ${planId}`);
    const updates: any = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(isActive !== undefined && { isActive }),
    };

    if (durationValue !== undefined) {
      const parsed = Number(durationValue);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
        logger.warn(`Invalid durationValue provided for update: ${durationValue}`);
        return sendBadRequest(res, 'durationValue must be a positive integer');
      }
      updates.durationValue = parsed;
    }

    if (durationUnit !== undefined) {
      updates.durationUnit = durationUnit;
    }

    const updatedPlan = await SubscriptionPlanService.updatePlan(planId, updates);

    logger.info(`Plan updated successfully: ${planId}`);
    return sendSuccess(res, updatedPlan);
  } catch (error) {
    logger.error(`Error updating plan: ${error}`);
    return sendInternalError(res, 'Failed to update plan');
  }
};

// Delete a plan
export const deletePlan = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;

    if (!planId) {
      logger.warn('planId is required');
      return sendBadRequest(res, 'planId is required');
    }

    logger.info(`Fetching plan for deletion: ${planId}`);
    const plan = await SubscriptionPlanService.getPlanById(planId);

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return sendNotFound(res, 'Plan not found');
    }

    // Verify user owns the gym
    if (plan.gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${plan.gymId}`);
      return sendForbidden(res, 'You do not own this gym');
    }

    logger.info(`Deleting plan: ${planId}`);
    await SubscriptionPlanService.deletePlan(planId);

    logger.info(`Plan deleted successfully: ${planId}`);
    return sendSuccess(res, { message: 'Plan deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting plan: ${error}`);
    return sendInternalError(res, 'Failed to delete plan');
  }
};

// Get all active plans for a gym
export const getActivePlansByGym = async (
  req: Request,
  res: Response
) => {
  try {
    const { gymId } = req.query;

    if (!gymId || typeof gymId !== 'string') {
      logger.warn('gymId is required');
      return sendBadRequest(res, 'gymId is required');
    }

    logger.info(`Fetching active plans for gymId: ${gymId}`);
    const plans = await SubscriptionPlanService.getActivePlansByGym(gymId);

    logger.info(`Found ${plans.length} active plans for gymId: ${gymId}`);
    return sendSuccess(res, plans);
  } catch (error) {
    logger.error(`Error fetching active plans: ${error}`);
    return sendInternalError(res, 'Failed to fetch active plans');
  }
};
