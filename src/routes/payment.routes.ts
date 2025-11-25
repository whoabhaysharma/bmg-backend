import { Router } from 'express';
import { verifyPayment } from '../controllers/payment.controller';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/verify', isAuthenticated, verifyPayment);

export default router;
