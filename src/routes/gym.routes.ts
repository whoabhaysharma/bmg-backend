import { Router } from 'express';
import {
  createGym,
  getAllGyms,
  getMyGyms,
  getGymById,
  updateGym,
  deleteGym,
} from '../controllers/gym.controller';
import { isAuthenticated } from '../middleware';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';

const router = Router();

// Only OWNER or ADMIN can create, update, delete gyms
router.post('/', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), createGym);
router.put('/:id', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), updateGym);
router.delete('/:id', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), deleteGym);

// All authenticated users can view gyms
router.get('/me/owned', isAuthenticated, getMyGyms);
router.get('/', isAuthenticated, getAllGyms);
router.get('/:id', isAuthenticated, getGymById);

export default router;
