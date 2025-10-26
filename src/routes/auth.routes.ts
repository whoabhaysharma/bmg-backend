import express from 'express';
import { googleAuth, updateProfile, registerGymOwner } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Google authentication
router.post('/google', googleAuth);

// Register as gym owner
router.post('/register-gym-owner', registerGymOwner);

// Update profile (protected route)
router.patch('/profile/:userId', authenticate, updateProfile);

export default router;