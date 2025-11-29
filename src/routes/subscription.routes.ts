import { Router } from 'express';
import { createSubscription, getMySubscriptions, getGymSubscriptions } from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/', isAuthenticated, createSubscription);
router.get('/my-subscriptions', isAuthenticated, getMySubscriptions);
router.get('/', isAuthenticated, getGymSubscriptions);

export default router;
