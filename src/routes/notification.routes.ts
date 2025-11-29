import { Router } from 'express';
import {
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from '../controllers/notification.controller';
import { isAuthenticated } from '../middleware';

const router = Router();

router.get('/', isAuthenticated, getMyNotifications);
router.patch('/:id/read', isAuthenticated, markNotificationRead);
router.patch('/read-all', isAuthenticated, markAllNotificationsRead);

export default router;
