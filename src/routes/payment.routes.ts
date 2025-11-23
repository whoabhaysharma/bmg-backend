import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { isAuthenticated } from '../middleware/index.js';

const router = Router();

router.post('/verify', isAuthenticated, paymentController.verifyPayment);

export default router;
