import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';

const router = Router();

router.get('/profile', isAuthenticated, getMyProfile);
router.put('/profile', isAuthenticated, updateMyProfile);

export default router;
