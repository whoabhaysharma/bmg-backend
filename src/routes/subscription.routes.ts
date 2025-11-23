import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller.js';
import { isAuthenticated } from '../middleware/index.js';

const router = Router();

router.post('/', isAuthenticated, subscriptionController.createSubscription);
router.get('/my-subscriptions', isAuthenticated, subscriptionController.getMySubscriptions);

export default router;
