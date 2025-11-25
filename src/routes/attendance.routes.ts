import { Router } from 'express';
import {
  getMyAttendance,
  checkIn,
  checkOut,
} from '../controllers';
import { isAuthenticated } from '../middleware';

const router = Router();

// User attendance routes
router.get('/me', isAuthenticated, getMyAttendance);
router.post('/gym/:gymId/check-in', isAuthenticated, checkIn);
router.post('/:attendanceId/check-out', isAuthenticated, checkOut);

export default router;
