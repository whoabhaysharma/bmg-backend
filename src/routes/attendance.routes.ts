import { Router } from 'express';
import {
  getMyAttendance,
  checkIn,
  checkOut,
  verifyCheckIn,
} from '../controllers';
import { isAuthenticated } from '../middleware';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';

const router = Router();

// User attendance routes
router.get('/me', isAuthenticated, getMyAttendance);
router.post('/gym/:gymId/check-in', isAuthenticated, checkIn);
router.post('/:attendanceId/check-out', isAuthenticated, checkOut);

// Owner/Admin routes
router.post('/gym/:gymId/verify-check-in', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), verifyCheckIn);

export default router;
