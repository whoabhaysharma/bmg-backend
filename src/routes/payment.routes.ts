import { Router } from 'express';
import { getAllPayments, handleWebhook } from '../controllers';
import { isAuthenticated, apiAuth } from '../middleware';

const router = Router();

router.post('/webhook', handleWebhook);
router.get('/', apiAuth, isAuthenticated, getAllPayments);

export default router;
