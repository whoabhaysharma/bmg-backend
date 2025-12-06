import { Router } from 'express';
import { notificationController } from "@controllers";
import { isAuthenticated } from '../middleware';

const router = Router();

router.get('/', isAuthenticated, notificationController.getNotifications);
router.patch('/:id/read', isAuthenticated, notificationController.markNotificationRead);
router.patch('/read-all', isAuthenticated, notificationController.markAllNotificationsRead);

export default router;
