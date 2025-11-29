import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import gymRoutes from './gym.routes';
import planRoutes from './plan.routes';
import subscriptionRoutes from './subscription.routes';
import paymentRoutes from './payment.routes';
import attendanceRoutes from './attendance.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Authenticated user routes
router.use('/users', userRoutes);
router.use('/gyms', gymRoutes);
router.use('/', planRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance', attendanceRoutes);

export default router;
