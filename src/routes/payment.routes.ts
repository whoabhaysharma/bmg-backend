import { Router } from 'express';
import { paymentController } from "@controllers";
import { isAuthenticated, apiAuth } from '../middleware';

const router = Router();

router.post('/webhook', paymentController.handleWebhook);
router.post('/test/flow', apiAuth, paymentController.testPaymentFlow);
router.get('/', apiAuth, isAuthenticated, paymentController.getAllPayments);

export default router;
