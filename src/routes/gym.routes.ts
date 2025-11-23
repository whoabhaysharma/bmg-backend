import { Router } from 'express';
import {
  createGym,
  getAllGyms,
  getMyGyms,
  getGymById,
  updateGym,
  deleteGym,
} from '../controllers/gym.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isOwner } from '../middleware/isOwner';

const router = Router();

router.post('/', isAuthenticated, isOwner, createGym);
router.get('/', isAuthenticated, getAllGyms);
router.get('/me/owned', isAuthenticated, getMyGyms);
router.get('/:id', isAuthenticated, getGymById);
router.put('/:id', isAuthenticated, isOwner, updateGym);
router.delete('/:id', isAuthenticated, isOwner, deleteGym);

export default router;
