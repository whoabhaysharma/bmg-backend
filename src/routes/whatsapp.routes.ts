import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller';
import { apiAuth, isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// Public routes (secured by secret or Admin token)
router.use(apiAuth, isAuthenticated, isAdmin);
router.get('/user', whatsappController.checkUser);
router.get('/gyms', whatsappController.getGyms);
router.get('/plans', whatsappController.getPlans);
router.post('/subscribe', whatsappController.createWhatsappSubscription);
router.get('/subscription', whatsappController.checkSubscription);

export default router;
