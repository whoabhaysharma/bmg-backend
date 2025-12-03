import { Router } from 'express';
import { createSubscription, getMySubscriptions, getAllSubscriptions, manualActivateSubscription, createConsoleSubscription } from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/', isAuthenticated, createSubscription);
router.post('/console', isAuthenticated, createConsoleSubscription);
router.get('/my-subscriptions', isAuthenticated, getMySubscriptions);
router.get('/', isAuthenticated, getAllSubscriptions);
router.patch('/:id/activate', isAuthenticated, manualActivateSubscription);

export default router;
