import { Request, Response } from 'express';
import logger from '../lib/logger';
import { AuthenticatedRequest } from '../types/api.types';
import { SubscriptionService } from '../services/subscription.service';
import { GymService } from '../services/gym.service';
import { sendSuccess, sendBadRequest, sendNotFound, sendForbidden, sendInternalError } from '../utils/response';
import { SubscriptionStatus } from '@prisma/client';

// Create a new subscription
export const createSubscription = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { planId, gymId } = req.body;

    if (!planId || !gymId) {
      logger.warn('Missing required fields for subscription creation');
      return sendBadRequest(res, 'Missing required fields: planId, gymId');
    }

    // Check if user already has an active subscription for this gym
    logger.info(`Checking existing subscription for userId: ${userId}, gymId: ${gymId}`);
    const existingSubscription = await SubscriptionService.getActiveUserSubscription(userId!, gymId);

    if (existingSubscription) {
      logger.warn(`User ${userId} already has active subscription for gym ${gymId}`);
      return sendBadRequest(res, 'You already have an active subscription for this gym');
    }

    logger.info(`Creating subscription for userId: ${userId}, planId: ${planId}, gymId: ${gymId}`);
    const subscription = await SubscriptionService.createSubscription({
      userId: userId!,
      planId,
      gymId,
    });

    logger.info(`Subscription created successfully: ${subscription.id}`);
    return sendSuccess(res, subscription, 201);
  } catch (error) {
    logger.error(`Error creating subscription: ${error}`);
    return sendInternalError(res, 'Failed to create subscription');
  }
};

// Get subscription by ID
export const getSubscriptionById = async (
  req: Request,
  res: Response
) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      logger.warn('subscriptionId is required');
      return sendBadRequest(res, 'subscriptionId is required');
    }

    logger.info(`Fetching subscription: ${subscriptionId}`);
    const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);

    if (!subscription) {
      logger.warn(`Subscription not found: ${subscriptionId}`);
      return sendNotFound(res, 'Subscription not found');
    }

    logger.info(`Subscription found: ${subscriptionId}`);
    return sendSuccess(res, subscription);
  } catch (error) {
    logger.error(`Error fetching subscription: ${error}`);
    return sendInternalError(res, 'Failed to fetch subscription');
  }
};

// Get user's subscriptions
export const getUserSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    logger.info(`Fetching subscriptions for userId: ${userId}`);
    const subscriptions = await SubscriptionService.getUserSubscriptions(userId!);

    logger.info(`Found ${subscriptions.length} subscriptions for userId: ${userId}`);
    return sendSuccess(res, subscriptions);
  } catch (error) {
    logger.error(`Error fetching user subscriptions: ${error}`);
    return sendInternalError(res, 'Failed to fetch subscriptions');
  }
};

// Get gym's subscriptions (owner only)
export const getGymSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { gymId } = req.query;

    if (!gymId || typeof gymId !== 'string') {
      logger.warn('gymId is required');
      return sendBadRequest(res, 'gymId is required');
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

    logger.info(`Fetching subscriptions for gymId: ${gymId}`);
    const subscriptions = await SubscriptionService.getGymSubscriptions(gymId);

    logger.info(`Found ${subscriptions.length} subscriptions for gymId: ${gymId}`);
    return sendSuccess(res, subscriptions);
  } catch (error) {
    logger.error(`Error fetching gym subscriptions: ${error}`);
    return sendInternalError(res, 'Failed to fetch gym subscriptions');
  }
};

// Update subscription status
export const updateSubscriptionStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { subscriptionId } = req.params;
    const { status } = req.body;

    if (!subscriptionId) {
      logger.warn('subscriptionId is required');
      return sendBadRequest(res, 'subscriptionId is required');
    }

    if (!status || !Object.values(SubscriptionStatus).includes(status)) {
      logger.warn('Valid status is required');
      return sendBadRequest(res, 'Valid status is required (ACTIVE, EXPIRED, CANCELLED)');
    }

    logger.info(`Fetching subscription for status update: ${subscriptionId}`);
    const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);

    if (!subscription) {
      logger.warn(`Subscription not found: ${subscriptionId}`);
      return sendNotFound(res, 'Subscription not found');
    }

    // Verify user owns the gym or is the subscriber
    if (subscription.gym.ownerId !== userId && subscription.userId !== userId) {
      logger.warn(`Unauthorized: User ${userId} cannot update subscription ${subscriptionId}`);
      return sendForbidden(res, 'You are not authorized to update this subscription');
    }

    logger.info(`Updating subscription status: ${subscriptionId} to ${status}`);
    const updatedSubscription = await SubscriptionService.updateSubscriptionStatus(subscriptionId, status);

    logger.info(`Subscription status updated successfully: ${subscriptionId}`);
    return sendSuccess(res, updatedSubscription);
  } catch (error) {
    logger.error(`Error updating subscription status: ${error}`);
    return sendInternalError(res, 'Failed to update subscription status');
  }
};

// Get subscription by access code (for gym check-ins)
export const getSubscriptionByAccessCode = async (
  req: Request,
  res: Response
) => {
  try {
    const { accessCode } = req.params;

    if (!accessCode) {
      logger.warn('accessCode is required');
      return sendBadRequest(res, 'accessCode is required');
    }

    logger.info(`Fetching subscription by access code: ${accessCode}`);
    const subscription = await SubscriptionService.getSubscriptionByAccessCode(accessCode);

    if (!subscription) {
      logger.warn(`Subscription not found for access code: ${accessCode}`);
      return sendNotFound(res, 'Invalid access code');
    }

    // Check if subscription is valid
    const isValid = await SubscriptionService.isSubscriptionValid(subscription.id);
    if (!isValid) {
      logger.warn(`Subscription not valid: ${subscription.id}`);
      return sendBadRequest(res, 'Subscription is expired or inactive');
    }

    logger.info(`Valid subscription found for access code: ${accessCode}`);
    return sendSuccess(res, subscription);
  } catch (error) {
    logger.error(`Error fetching subscription by access code: ${error}`);
    return sendInternalError(res, 'Failed to verify access code');
  }
};

// Get active subscription for user at gym
export const getActiveUserSubscription = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { gymId } = req.query;

    if (!gymId || typeof gymId !== 'string') {
      logger.warn('gymId is required');
      return sendBadRequest(res, 'gymId is required');
    }

    logger.info(`Fetching active subscription for userId: ${userId}, gymId: ${gymId}`);
    const subscription = await SubscriptionService.getActiveUserSubscription(userId!, gymId);

    if (!subscription) {
      logger.info(`No active subscription found for userId: ${userId}, gymId: ${gymId}`);
      return sendSuccess(res, null);
    }

    logger.info(`Active subscription found: ${subscription.id}`);
    return sendSuccess(res, subscription);
  } catch (error) {
    logger.error(`Error fetching active subscription: ${error}`);
    return sendInternalError(res, 'Failed to fetch active subscription');
  }
};

// Get expiring subscriptions (owner view)
export const getExpiringSubscriptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { gymId } = req.query;

    if (gymId && typeof gymId === 'string') {
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
    }

    logger.info(`Fetching expiring subscriptions for gymId: ${gymId || 'all'}`);
    const subscriptions = await SubscriptionService.getExpiringSubscriptions(
      gymId && typeof gymId === 'string' ? gymId : undefined
    );

    logger.info(`Found ${subscriptions.length} expiring subscriptions`);
    return sendSuccess(res, subscriptions);
  } catch (error) {
    logger.error(`Error fetching expiring subscriptions: ${error}`);
    return sendInternalError(res, 'Failed to fetch expiring subscriptions');
  }
};

// Delete subscription (admin/owner only)
export const deleteSubscription = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      logger.warn('subscriptionId is required');
      return sendBadRequest(res, 'subscriptionId is required');
    }

    logger.info(`Fetching subscription for deletion: ${subscriptionId}`);
    const subscription = await SubscriptionService.getSubscriptionById(subscriptionId);

    if (!subscription) {
      logger.warn(`Subscription not found: ${subscriptionId}`);
      return sendNotFound(res, 'Subscription not found');
    }

    // Verify user owns the gym
    if (subscription.gym.ownerId !== userId) {
      logger.warn(`Unauthorized: User ${userId} does not own gym ${subscription.gymId}`);
      return sendForbidden(res, 'You do not own this gym');
    }

    logger.info(`Deleting subscription: ${subscriptionId}`);
    await SubscriptionService.deleteSubscription(subscriptionId);

    logger.info(`Subscription deleted successfully: ${subscriptionId}`);
    return sendSuccess(res, { message: 'Subscription deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting subscription: ${error}`);
    return sendInternalError(res, 'Failed to delete subscription');
  }
};
