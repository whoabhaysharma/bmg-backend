import { Router } from 'express';
import {
  processPayment,
  getMyPayments,
  getGymPayments,
  handleWebhook,
} from '../controllers/payment.controller';
import { isAuthenticated, isOwner, validate } from '../middleware';
import { paymentProcessSchema } from '../types/schemas';

const router = Router();

// Payment processing
router.post('/:subscriptionId/process', isAuthenticated, validate({ body: paymentProcessSchema }), processPayment);

// Payment history routes
router.get('/history', isAuthenticated, getMyPayments);
router.get('/gym/:gymId/history', isAuthenticated, isOwner, getGymPayments);

// Payment webhook for external payment gateway
router.post('/webhook', handleWebhook);

export default router;
