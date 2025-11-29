import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Process a payment for a subscription
export const processPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { subscriptionId } = req.params;
  const { method } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Not authenticated',
    });
  }

  logger.info('Processing payment', { userId, subscriptionId });

  try {
    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        payment: true,
        plan: true,
      },
    });

    if (!subscription) {
      logger.warn('Subscription not found', { userId, subscriptionId });
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Subscription not found',
      });
    }

    if (subscription.payment?.status === 'COMPLETED') {
      logger.warn('Payment already completed', {
        userId,
        subscriptionId,
        paymentId: subscription.payment.id,
      });
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Payment already completed',
      });
    }

    // In a real application, you would integrate with a payment gateway here
    // For now, we'll simulate a successful payment
    const payment = await prisma.payment.update({
      where: {
        subscriptionId,
      },
      data: {
        status: 'COMPLETED',
        method,
      },
    });

    logger.info('Successfully processed payment', {
      userId,
      subscriptionId,
      paymentId: payment.id,
    });

    return res.status(200).json({
      success: true,
      data: payment,
      error: null,
    });
  } catch (error) {
    logger.error('Error processing payment', {
      userId: userId,
      subscriptionId,
      error,
    });
    next(error);
  }
};

// Get payment history for a user
export const getMyPayments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Not authenticated',
    });
  }

  logger.info('Fetching payment history', { userId: req.user.id });

  try {
    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          userId: req.user.id,
        },
      },
      include: {
        subscription: {
          include: {
            gym: {
              select: {
                id: true,
                name: true,
              },
            },
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched payment history', {
      userId: req.user.id,
      count: payments.length,
    });

    return res.status(200).json({
      success: true,
      data: payments,
      error: null,
    });
  } catch (error) {
    logger.error('Error fetching payment history', {
      userId: req.user.id,
      error,
    });
    next(error);
  }
};

// Get gym's payment history (for gym owners)
export const getGymPayments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { gymId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Not authenticated',
    });
  }

  logger.info('Fetching gym payment history', { userId: req.user.id, gymId });

  try {
    // Verify gym ownership
    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        ownerId: req.user.id,
      },
    });

    if (!gym) {
      logger.warn('Unauthorized access to gym payment history', {
        userId: req.user.id,
        gymId,
      });
      return res.status(403).json({
        success: false,
        data: null,
        error: "Not authorized to view this gym's payment history",
      });
    }

    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          gymId,
        },
      },
      include: {
        subscription: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info('Successfully fetched gym payment history', {
      userId: req.user.id,
      gymId,
      count: payments.length,
    });

    return res.status(200).json({
      success: true,
      data: payments,
      error: null,
    });
  } catch (error) {
    logger.error('Error fetching gym payment history', {
      userId: req.user.id,
      gymId,
      error,
    });
    next(error);
  }
};

// Handle payment webhook from payment gateway
export const handleWebhook = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info('Handling payment webhook');
  try {
    // TODO: Implement payment gateway webhook handler
    // const { type, data } = req.body;

    // Verify webhook signature
    // Update payment status based on webhook event
    // Send notifications to relevant users

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    logger.error('Error handling payment webhook', error);
    next(error);
  }
};
