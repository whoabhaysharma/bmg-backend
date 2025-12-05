import { Router } from 'express';
import { getDashboardStats } from '../controllers/admin.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isAdmin } from '../middleware/isAdmin';

const router = Router();

router.get('/dashboard-stats', isAuthenticated, isAdmin, getDashboardStats);

export default router;
