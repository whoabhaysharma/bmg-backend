import { Router } from 'express';
import { googleAuth, updateProfile, registerGymOwner, assignRole } from '../controllers/auth.controller.js';

const router = Router();

// Authentication Routes
router.post('/auth/google', googleAuth);
router.put('/profile/:userId', updateProfile);

// Role Management
router.post('/users/:userId/roles', assignRole);

// Gym Owner Registration (requires OWNER role)
router.post('/auth/register-gym-owner', registerGymOwner);

export default router;