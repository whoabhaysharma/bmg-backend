import { Router } from 'express';
import { attendanceController } from "@controllers";
import { isAuthenticated } from '../middleware';
import { authorize } from '../middleware/authorize';
import { Role } from '@prisma/client';

const router = Router();

// User attendance routes
router.get('/', isAuthenticated, attendanceController.getAllAttendance);
router.post('/gym/:gymId/check-in', isAuthenticated, attendanceController.checkIn);
router.post('/:attendanceId/check-out', isAuthenticated, attendanceController.checkOut);

// Owner/Admin routes
router.post('/gym/:gymId/verify-check-in', isAuthenticated, authorize([Role.OWNER, Role.ADMIN]), attendanceController.verifyCheckIn);

export default router;
