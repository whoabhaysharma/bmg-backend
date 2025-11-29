import { Router } from 'express';
import { verifyPayment, getAllPayments } from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/verify', isAuthenticated, verifyPayment);
router.get('/', isAuthenticated, getAllPayments);

export default router;
