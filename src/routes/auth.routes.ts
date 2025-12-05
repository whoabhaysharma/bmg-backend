import { Router } from 'express';
import { sendOtp, verifyOtp, createMagicLink, loginWithMagicLink } from '../controllers';
import { apiAuth, isAuthenticated, isAdmin } from '../middleware';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Internal/Webhook route - protected by secret OR API Key
router.post('/magic-link', apiAuth, isAuthenticated, isAdmin, createMagicLink);

// Public route for frontend
router.post('/login-with-magic-link', loginWithMagicLink);

export default router;
