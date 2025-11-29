import { Router } from 'express';
import {
  createGym,
  getAllGyms,
  getMyGyms,
  getGymById,
  updateGym,
  deleteGym,
  verifyGym,
  unverifyGym,
  getGymStats,
} from '../controllers';
import { isAuthenticated } from '../middleware';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';

const router = Router();

// Only OWNER or ADMIN can create, update, delete gyms
router.post('/', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), createGym);
router.put('/:id', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), updateGym);
router.delete('/:id', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), deleteGym);

// Admin only routes
router.patch('/:id/verify', isAuthenticated, authorize([Role.ADMIN]), verifyGym);
router.patch('/:id/unverify', isAuthenticated, authorize([Role.ADMIN]), unverifyGym);

// All authenticated users can view gyms
router.get('/me/owned', isAuthenticated, getMyGyms);
router.get('/', isAuthenticated, getAllGyms);
router.get('/:id', isAuthenticated, getGymById);
router.get('/:id/stats', isAuthenticated, getGymStats);

export default router;
