import { Router } from 'express';
import {
  createSubscription,
  getSubscriptionById,
  getUserSubscriptions,
  getGymSubscriptions,
  updateSubscriptionStatus,
  getSubscriptionByAccessCode,
  getActiveUserSubscription,
  getExpiringSubscriptions,
  deleteSubscription,
} from '../controllers/subscription.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { validate } from '../middleware/validate';
import { subscriptionCreateSchema } from '../types/schemas';

const router = Router();

// Create a new subscription
router.post(
  '/',
  isAuthenticated,
  validate({ body: subscriptionCreateSchema }),
  createSubscription
);

// Get user's subscriptions
router.get(
  '/my',
  isAuthenticated,
  getUserSubscriptions
);

// Get active subscription for user at specific gym
router.get(
  '/active',
  isAuthenticated,
  getActiveUserSubscription
);

// Get expiring subscriptions (owner view)
router.get(
  '/expiring',
  isAuthenticated,
  getExpiringSubscriptions
);

// Get gym's subscriptions (owner only)
router.get(
  '/gym',
  isAuthenticated,
  getGymSubscriptions
);

// Get subscription by access code (for gym check-ins)
router.get(
  '/access/:accessCode',
  getSubscriptionByAccessCode
);

// Get subscription by ID
router.get(
  '/:subscriptionId',
  getSubscriptionById
);

// Update subscription status
router.patch(
  '/:subscriptionId/status',
  isAuthenticated,
  updateSubscriptionStatus
);

// Delete subscription (owner only)
router.delete(
  '/:subscriptionId',
  isAuthenticated,
  deleteSubscription
);

export default router;
