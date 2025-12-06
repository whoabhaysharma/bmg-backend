import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';

import { isAuthenticated, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/dashboard-stats', isAuthenticated, authorize([Role.ADMIN]), adminController.getDashboardStats);

export default router;
