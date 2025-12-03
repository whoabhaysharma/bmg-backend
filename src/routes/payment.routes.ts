import { Router } from 'express';
import { verifyPayment, getAllPayments, handleWebhook } from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/verify', isAuthenticated, verifyPayment);
router.post('/webhook', handleWebhook);
router.get('/', isAuthenticated, getAllPayments);

export default router;
