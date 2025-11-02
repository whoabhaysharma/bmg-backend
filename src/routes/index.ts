import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import gymRoutes from './gym.routes';
import subscriptionRoutes from './subscription.routes';
import paymentRoutes from './payment.routes';
import attendanceRoutes from './attendance.routes';
import ownerRoutes from './owner.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Authenticated user routes
router.use('/users', userRoutes);
router.use('/gyms', gymRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance', attendanceRoutes);

// Role-specific routes
router.use('/owner', ownerRoutes);
router.use('/admin', adminRoutes);


export default router;