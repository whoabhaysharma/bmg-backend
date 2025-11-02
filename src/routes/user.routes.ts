import { Router } from 'express';
import { getMyProfile, updateMyProfile } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';

const router = Router();

router.get('/profile', isAuthenticated as any, getMyProfile as any);
router.put('/profile', isAuthenticated as any, updateMyProfile as any);

export default router;
