import { RequestHandler } from 'express';
import { notificationService } from '../services/notification.service';
import { getAuthUser } from '../utils/getAuthUser';
import { sendSuccess, sendError, sendUnauthorized } from '../utils/response';

export const getMyNotifications: RequestHandler = async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return sendUnauthorized(res);

    try {
        const notifications = await notificationService.getUserNotifications(user.id);
        const unreadCount = await notificationService.getUnreadCount(user.id);
        return sendSuccess(res, { notifications, unreadCount });
    } catch (error: any) {
        return sendError(res, error.message || 'Failed to fetch notifications');
    }
};

export const markNotificationRead: RequestHandler = async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return sendUnauthorized(res);
    const { id } = req.params;

    try {
        await notificationService.markAsRead(id, user.id);
        return sendSuccess(res, { message: 'Notification marked as read' });
    } catch (error: any) {
        return sendError(res, error.message || 'Failed to mark notification as read');
    }
};

export const markAllNotificationsRead: RequestHandler = async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return sendUnauthorized(res);

    try {
        await notificationService.markAllAsRead(user.id);
        return sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (error: any) {
        return sendError(res, error.message || 'Failed to mark all notifications as read');
    }
};
