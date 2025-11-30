import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import gymRoutes from './gym.routes';
import planRoutes from './plan.routes';
import subscriptionRoutes from './subscription.routes';
import paymentRoutes from './payment.routes';
import attendanceRoutes from './attendance.routes';
import notificationRoutes from './notification.routes';
import settlementRoutes from './settlement.routes';
import whatsappRoutes from './whatsapp.routes';
import apiKeyRoutes from './apiKey.routes';

import { apiAuth } from '../middleware';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Authenticated user routes
router.use('/users', apiAuth, userRoutes);
router.use('/gyms', apiAuth, gymRoutes);
router.use('/plans', apiAuth, planRoutes);
router.use('/subscriptions', apiAuth, subscriptionRoutes);
router.use('/payments', apiAuth, paymentRoutes);
router.use('/attendance', apiAuth, attendanceRoutes);
router.use('/notifications', apiAuth, notificationRoutes);
router.use('/settlements', apiAuth, settlementRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/api-keys', apiKeyRoutes);

export default router;
