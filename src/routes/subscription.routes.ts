import { Router } from 'express';
import { subscriptionController } from "@controllers";
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/', isAuthenticated, subscriptionController.createSubscription);
router.post('/console', isAuthenticated, subscriptionController.createConsoleSubscription);
router.get('/my-subscriptions', isAuthenticated, subscriptionController.getMySubscriptions);
router.get('/', isAuthenticated, subscriptionController.getAllSubscriptions);
router.patch('/:id/activate', isAuthenticated, subscriptionController.manualActivateSubscription);

export default router;
