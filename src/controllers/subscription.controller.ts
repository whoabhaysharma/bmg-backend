import { Request, Response } from 'express';
import { createSubscription as createSubscriptionService } from '../services/subscription.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { planId, gymId } = req.body;
    const userId = (req as any).user.id; // Assuming isAuthenticated middleware adds user to req

    if (!planId || !gymId) {
      return res.status(400).json({ message: 'Plan ID and Gym ID are required' });
    }

    const result = await createSubscriptionService(userId, planId, gymId);

    res.status(201).json({
      message: 'Subscription created and payment order generated',
      ...result,
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: error.message || 'Failed to create subscription' });
  }
};

export const getMySubscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        gym: true,
        plan: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(subscriptions);
  } catch (error: any) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
};
