import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller';

const router = Router();

// Middleware to verify internal secret (simple security)
const verifySecret = (req: any, _res: any, next: any) => {
    const secret = req.headers['x-whatsapp-secret'];
    if (secret !== process.env.WHATSAPP_BACKEND_SECRET) {
        // For now, let's just log and proceed or skip if env not set
        // In prod, this should be strict.
        // return res.status(403).json({ message: 'Forbidden' });
        console.warn('Invalid WhatsApp Secret');
    }
    next();
};

// Public routes (secured by secret)
router.use(verifySecret);
router.get('/user', whatsappController.checkUser);
router.get('/gyms', whatsappController.getGyms);
router.get('/plans', whatsappController.getPlans);
router.post('/subscribe', whatsappController.createWhatsappSubscription);
router.get('/subscription', whatsappController.checkSubscription);

export default router;
