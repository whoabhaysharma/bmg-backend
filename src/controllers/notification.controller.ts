import { RequestHandler } from 'express';
import { notificationService } from '../services/notification.service';
import { getAuthUser } from '../utils/getAuthUser';
import { sendSuccess, sendError, sendUnauthorized } from '../utils/response';

import { NotificationType } from '@prisma/client';

export const getNotifications: RequestHandler = async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return sendUnauthorized(res);

    try {
        const { userId, type, isRead, page, limit } = req.query;
        const userRoles = user.roles || [];

        let filterUserId: string | undefined = userId as string;

        // Admin can view any user's notifications.
        // Regular users (and Owners) can only view their own.
        if (!userRoles.includes('ADMIN')) {
            filterUserId = user.id;
        }

        const result = await notificationService.getNotifications({
            userId: filterUserId,
            type: type as NotificationType,
            isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
            page: Number(page) || 1,
            limit: Number(limit) || 10,
        });

        return sendSuccess(res, result);
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
