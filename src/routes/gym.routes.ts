import { Router } from 'express';
import { gymController } from "controllers";
import { isAuthenticated } from '../middleware';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';

const router = Router();

// Only OWNER or ADMIN can create, update, delete gyms
router.post('/', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), gymController.createGym);
router.put('/:id', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), gymController.updateGym);
router.delete('/:id', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), gymController.deleteGym);

// Admin only routes
router.patch('/:id/verify', isAuthenticated, authorize([Role.ADMIN]), gymController.verifyGym);
router.patch('/:id/unverify', isAuthenticated, authorize([Role.ADMIN]), gymController.unverifyGym);

// All authenticated users can view gyms
router.get('/me/owned', isAuthenticated, gymController.getMyGyms);
router.get('/', isAuthenticated, gymController.getAllGyms);
router.get('/:id', isAuthenticated, gymController.getGymById);
router.get('/:id/stats', isAuthenticated, gymController.getGymStats);

export default router;
