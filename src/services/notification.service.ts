import prisma from '../lib/prisma';
import { NotificationType } from '@prisma/client';

export const notificationService = {
    // Create a notification
    async createNotification(userId: string, title: string, message: string, type: NotificationType = 'INFO') {
        return prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
            },
        });
    },

    // Get user notifications
    async getUserNotifications(userId: string) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50 notifications
        });
    },

    // Mark a single notification as read
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

    // Mark all notifications as read for a user
    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    },

    // Get unread count
    async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: { userId, isRead: false },
        });
    },
};
