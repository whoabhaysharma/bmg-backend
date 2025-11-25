import { Router } from 'express';
import { createSubscription, getMySubscriptions } from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/', isAuthenticated, createSubscription);
router.get('/my-subscriptions', isAuthenticated, getMySubscriptions);

export default router;
