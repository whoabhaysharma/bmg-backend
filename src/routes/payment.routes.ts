import { Router } from 'express';
import { getAllPayments, handleWebhook } from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

router.post('/webhook', handleWebhook);
router.get('/', isAuthenticated, getAllPayments);

export default router;
