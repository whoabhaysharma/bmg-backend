import { Router } from 'express';
import {
  processPayment,
  getMyPayments,
  getGymPayments,
  handleWebhook,
} from '../controllers/payment.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isOwner } from '../middleware/isOwner';
import { validate } from '../middleware/validate';
import { paymentProcessSchema } from '../types/schemas';

const router = Router();

// Payment processing
router.post(
  '/:subscriptionId/process',
  isAuthenticated,
  validate(paymentProcessSchema),
  processPayment
);

// Payment history routes
router.get('/history', isAuthenticated, getMyPayments);
router.get('/gym/:gymId/history', isAuthenticated, isOwner, getGymPayments);

// Payment webhook for external payment gateway
router.post('/webhook', handleWebhook);

export default router;
