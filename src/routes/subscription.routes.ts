import { Router } from 'express';
import {
  getMySubscriptions,
  subscribe,
  cancelSubscription,
} from '../controllers/subscription.controller';
import { isAuthenticated, validate } from '../middleware';
import { subscriptionCreateSchema } from '../types/schemas';

const router = Router();

// User subscription routes
router.get('/me', isAuthenticated, getMySubscriptions);
router.post('/subscribe', isAuthenticated, validate({ body: subscriptionCreateSchema }), subscribe);
router.post('/:subscriptionId/cancel', isAuthenticated, cancelSubscription);

export default router;
