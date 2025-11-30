import prisma from '../lib/prisma';
import { NotificationType } from '@prisma/client';
import { NotificationEvent, NotificationEventData } from '../types/notification-events';
import { notificationTemplates } from '../config/notification-templates';
import logger from '../lib/logger';

export const notificationService = {
    /**
     * Create a notification using event-based templates
     * This is the recommended way to create notifications
     */
    async notifyUser<T extends NotificationEvent>(
        userId: string,
        event: T,
        data: NotificationEventData[T]
    ) {
        try {
            const template = notificationTemplates[event];
            const title = template.title(data);
            const message = template.message(data);
            const type = template.type;

            return await prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type,
                },
            });
        } catch (error) {
            logger.error('Failed to create notification:', { userId, event, error });
            // Don't throw - notifications should never break the main flow
            return null;
        }
    },

    /**
     * Create multiple notifications for different users with the same event
     * Useful for broadcasting notifications
     */
    async notifyMultipleUsers<T extends NotificationEvent>(
        userIds: string[],
        event: T,
        data: NotificationEventData[T]
    ) {
        try {
            const template = notificationTemplates[event];
            const title = template.title(data);
            const message = template.message(data);
            const type = template.type;

            const notifications = userIds.map(userId => ({
                userId,
                title,
                message,
                type,
            }));

            return await prisma.notification.createMany({
                data: notifications,
            });
        } catch (error) {
            logger.error('Failed to create batch notifications:', { userIds, event, error });
            return null;
        }
    },

    /**
     * Legacy method for backward compatibility
     * Use notifyUser() instead for new code
     */
    async createNotification(
        userId: string,
        title: string,
        message: string,
        type: NotificationType = NotificationType.INFO
    ) {
        try {
            return await prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type,
                },
            });
        } catch (error) {
            logger.error('Failed to create notification:', { userId, title, error });
            return null;
        }
    },

    /**
     * Get user notifications with pagination
     */
    async getUserNotifications(userId: string, page = 1, limit = 50) {
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
        ]);

        return {
            data: notifications,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                unreadCount: await this.getUnreadCount(userId),
            },
        };
    },

    /**
     * Get only unread notifications
     */
    async getUnreadNotifications(userId: string) {
        return prisma.notification.findMany({
            where: { userId, isRead: false },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(id: string, userId: string) {
        // Ensure the notification belongs to the user
        const notification = await prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error('Notification not found or access denied');
        }

        return prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
    },

    /**
     * Mark multiple notifications as read
     */
    async markMultipleAsRead(ids: string[], userId: string) {
        return prisma.notification.updateMany({
            where: {
                id: { in: ids },
                userId, // Ensure user owns these notifications
            },
            data: { isRead: true },
        });
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    },

    /**
     * Get unread count
     */
    async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    },

    /**
     * Delete a notification
     */
    async deleteNotification(id: string, userId: string) {
        // Ensure the notification belongs to the user
        const notification = await prisma.notification.findFirst({
            where: { id, userId },
        });

        if (!notification) {
            throw new Error('Notification not found or access denied');
        }

        return prisma.notification.delete({
            where: { id },
        });
    },

    /**
     * Delete all read notifications for a user
     */
    async deleteReadNotifications(userId: string) {
        return prisma.notification.deleteMany({
            where: { userId, isRead: true },
        });
    },

    /**
     * Delete old notifications (cleanup job)
     * Deletes notifications older than specified days
     */
    async deleteOldNotifications(daysOld = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        return prisma.notification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                isRead: true,
            },
        });
    },
};

