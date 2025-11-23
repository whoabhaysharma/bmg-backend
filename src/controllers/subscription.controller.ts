import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Get my subscriptions
export const getMySubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  logger.info('Fetching user subscriptions', { userId });

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: true,
        payment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched subscriptions', {
      userId,
      count: subscriptions.length,
    });

    return res.status(200).json({
      success: true,
      data: subscriptions,
      error: null,
    });
  } catch (error) {
    logger.error('Error fetching subscriptions', { userId, error });
    next(error);
  }
};

// Subscribe to a plan
export const subscribe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { planId, gymId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  logger.info('Creating subscription', { userId, planId, gymId });

  try {
    // Check if user already has an active subscription for this gym
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        gymId,
        status: 'ACTIVE',
      },
    });

    if (existingSubscription) {
      logger.warn('Active subscription already exists', {
        userId,
        gymId,
        subscriptionId: existingSubscription.id,
      });
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription for this gym',
      });
    }

    // Create subscription and payment record in a transaction
    const subscription = await prisma.$transaction(async (tx) => {
      // Create subscription
      const sub = await tx.subscription.create({
        data: {
          userId,
          planId,
          gymId,
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now, will be updated based on plan duration
        },
        include: {
          gym: {
            select: {
              id: true,
              name: true,
            },
          },
          plan: true,
        },
      });

      // Create pending payment record with plan price
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          status: 'PENDING',
          amount: sub.plan.price,
          method: 'PENDING', // Will be updated during payment processing
        },
      });

      return sub;
    });

    logger.info('Successfully created subscription', {
      userId,
      subscriptionId: subscription.id,
      gymId,
      planId,
    });

    return res.status(201).json({
      success: true,
      data: subscription,
      error: null,
    });
  } catch (error) {
    logger.error('Error creating subscription', { userId, planId, gymId, error });
    next(error);
  }
};

// Cancel subscription
export const cancelSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { subscriptionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  logger.info('Canceling subscription', { userId, subscriptionId });

  try {
    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        payment: true,
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { userId, subscriptionId });
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    if (subscription.status === 'CANCELLED') {
      logger.warn('Subscription already cancelled', {
        userId,
        subscriptionId,
      });
      return res.status(400).json({
        success: false,
        error: 'Subscription is already cancelled',
      });
    }

    // Update subscription status
    const updatedSubscription = await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        status: 'CANCELLED',
        endDate: new Date(), // Set end date to now when cancelling
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        plan: true,
      },
    });

    logger.info('Successfully cancelled subscription', {
      userId,
      subscriptionId,
    });

    return res.status(200).json({
      success: true,
      data: updatedSubscription,
      error: null,
    });
  } catch (error) {
    logger.error('Error cancelling subscription', { userId, subscriptionId, error });
    next(error);
  }
};
