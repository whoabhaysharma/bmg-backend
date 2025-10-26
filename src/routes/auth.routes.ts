import express from 'express';
import { googleAuth, updateProfile } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Google authentication
router.post('/google', googleAuth);

// Update profile (protected route)
router.patch('/profile/:userId', authenticate, updateProfile);

export default router;