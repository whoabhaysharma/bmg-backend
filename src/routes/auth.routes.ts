import { Router } from 'express';
import { authController } from "@controllers";
import { apiAuth, isAuthenticated, isAdmin } from '../middleware';

const router = Router();

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// Internal/Webhook route - protected by secret OR API Key
router.post('/magic-link', apiAuth, isAuthenticated, isAdmin, authController.createMagicLink);

// Public route for frontend
router.post('/login-with-magic-link', authController.loginWithMagicLink);

export default router;
