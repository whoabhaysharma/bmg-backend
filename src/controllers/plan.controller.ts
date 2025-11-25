import { Request, Response } from 'express';
import logger from '../lib/logger';
import { AuthenticatedRequest } from '../types/api.types';
import { gymService, subscriptionPlanService } from '../services';
import { sendSuccess, sendBadRequest, sendNotFound, sendForbidden, sendInternalError } from '../utils/response';
import { Role } from '@prisma/client'; // Assuming Role enum is available

// Create a new subscription plan
export const createPlan = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { gymId, name, description, durationValue, durationUnit, price } = req.body;

    if (!userId) {
      return sendForbidden(res, 'Authentication required.');
    }

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

    // Verify user owns the gym OR is an Admin
    logger.info(`Verifying gym ownership/Admin role for userId: ${userId}, gymId: ${gymId}`);
    const gym = await gymService.getGymById(gymId);

    if (!gym) {
      logger.warn(`Gym not found: ${gymId}`);
      return sendNotFound(res, 'Gym not found');
    }

    // Authorization Check: Must be the owner OR an Admin
    const isOwner = gym.ownerId === userId;
    const isAdmin = req.user?.roles?.includes(Role.ADMIN);

    if (!isOwner && !isAdmin) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${gymId} and is not Admin`);
      return sendForbidden(res, 'You do not own this gym or have administrative privileges');
    }

    logger.info(`Creating plan for gymId: ${gymId}, name: ${name}`);
    const plan = await subscriptionPlanService.createPlan({
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

    // Note: This endpoint is public, allowing anyone to view plans for a gym.
    // If plans should only be visible to owners/admins, this endpoint must also be secured.

    logger.info(`Fetching plans for gymId: ${gymId}`);
    const plans = await subscriptionPlanService.getPlansByGym(gymId);

    logger.info(`Found ${plans.length} plans for gymId: ${gymId}`);
    return sendSuccess(res, plans);
  } catch (error) {
    logger.error(`Error fetching plans: ${error}`);
    return sendInternalError(res, 'Failed to fetch plans');
  }
};

// Get a single plan by ID
export const getPlanById = async (
  req: AuthenticatedRequest, // Changed to AuthenticatedRequest to access user details
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { planId } = req.params;

    if (!userId) {
      return sendForbidden(res, 'Authentication required.');
    }

    if (!planId) {
      logger.warn('planId is required');
      return sendBadRequest(res, 'planId is required');
    }

    logger.info(`Fetching plan: ${planId}`);
    // Service layer must ensure the related gym is fetched (e.g., include: { gym: true })
    const plan = await subscriptionPlanService.getPlanById(planId);

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return sendNotFound(res, 'Plan not found');
    }

    // Authorization Check: Must be the owner OR an Admin
    const isOwner = plan.gym.ownerId === userId;
    const isAdmin = req.user?.roles?.includes(Role.ADMIN);

    if (!isOwner && !isAdmin) {
      logger.warn(`Forbidden: User ${userId} is unauthorized to view plan ${planId}`);
      return sendForbidden(res, 'You are not authorized to view this plan');
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

    if (!userId) {
      return sendForbidden(res, 'Authentication required.');
    }

    if (!planId) {
      logger.warn('planId is required');
      return sendBadRequest(res, 'planId is required');
    }

    logger.info(`Fetching plan for update: ${planId}`);
    // Service layer must ensure the related gym is fetched (e.g., include: { gym: true })
    const plan = await subscriptionPlanService.getPlanById(planId);

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return sendNotFound(res, 'Plan not found');
    }

    // Authorization Check: Must be the owner OR an Admin
    const isOwner = plan.gym.ownerId === userId;
    const isAdmin = req.user?.roles?.includes(Role.ADMIN);

    if (!isOwner && !isAdmin) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${plan.gymId} and is not Admin`);
      return sendForbidden(res, 'You do not own this plan or have administrative privileges');
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

    const updatedPlan = await subscriptionPlanService.updatePlan(planId, updates);

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

    if (!userId) {
      return sendForbidden(res, 'Authentication required.');
    }

    if (!planId) {
      logger.warn('planId is required');
      return sendBadRequest(res, 'planId is required');
    }

    logger.info(`Fetching plan for deletion: ${planId}`);
    // Service layer must ensure the related gym is fetched (e.g., include: { gym: true })
    const plan = await subscriptionPlanService.getPlanById(planId);

    if (!plan) {
      logger.warn(`Plan not found: ${planId}`);
      return sendNotFound(res, 'Plan not found');
    }

    // Authorization Check: Must be the owner OR an Admin
    const isOwner = plan.gym.ownerId === userId;
    const isAdmin = req.user?.roles?.includes(Role.ADMIN);

    if (!isOwner && !isAdmin) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${plan.gymId} and is not Admin`);
      return sendForbidden(res, 'You do not own this plan or have administrative privileges');
    }

    logger.info(`Deleting plan: ${planId}`);
    await subscriptionPlanService.deletePlan(planId);

    logger.info(`Plan deleted successfully: ${planId}`);
    // Standard practice for a successful DELETE operation is 204 No Content
    return res.status(204).send();
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
    const plans = await subscriptionPlanService.getActivePlansByGym(gymId);

    logger.info(`Found ${plans.length} active plans for gymId: ${gymId}`);
    return sendSuccess(res, plans);
  } catch (error) {
    logger.error(`Error fetching active plans: ${error}`);
    return sendInternalError(res, 'Failed to fetch active plans');
  }
};