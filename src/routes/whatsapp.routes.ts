import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller';
import { verifySecret } from '../middleware';

const router = Router();

// Public routes (secured by secret)
router.use(verifySecret);
router.get('/user', whatsappController.checkUser);
router.get('/gyms', whatsappController.getGyms);
router.get('/plans', whatsappController.getPlans);
router.post('/subscribe', whatsappController.createWhatsappSubscription);
router.get('/subscription', whatsappController.checkSubscription);

export default router;
