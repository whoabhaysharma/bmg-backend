import { Router } from 'express';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../controllers/notification.controller';
import { isAuthenticated } from '../middleware';

const router = Router();

router.get('/', isAuthenticated, getNotifications);
router.patch('/:id/read', isAuthenticated, markNotificationRead);
router.patch('/read-all', isAuthenticated, markAllNotificationsRead);

export default router;
