import { NotificationType } from '@prisma/client';
import { NotificationEvent, NotificationEventData } from '../types/notification-events';

/**
 * Notification Template
 * 
 * Defines the structure of a notification template
 */
interface NotificationTemplate {
    title: (data: any) => string;
    message: (data: any) => string;
    type: NotificationType;
}

/**
 * Notification Templates
 * 
 * Centralized templates for all notification messages.
 * This ensures consistency and makes it easy to update messages.
 */
export const notificationTemplates: Record<NotificationEvent, NotificationTemplate> = {
    // User Events
    [NotificationEvent.USER_CREATED]: {
        title: () => 'Welcome to Gym Manager!',
        message: (data: NotificationEventData[NotificationEvent.USER_CREATED]) =>
            `Hello ${data.userName}, your account has been successfully created.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.USER_UPDATED]: {
        title: () => 'Profile Updated',
        message: () => 'Your profile details have been updated successfully.',
        type: NotificationType.INFO,
    },
    [NotificationEvent.USER_DELETED]: {
        title: () => 'Account Deactivated',
        message: (_data: NotificationEventData[NotificationEvent.USER_DELETED]) =>
            `Your account has been deactivated. Contact support if this was a mistake.`,
        type: NotificationType.WARNING,
    },
    [NotificationEvent.USER_RESTORED]: {
        title: () => 'Account Restored',
        message: () => 'Your account has been successfully restored. Welcome back!',
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.USER_ROLE_ADDED]: {
        title: () => 'New Role Assigned',
        message: (data: NotificationEventData[NotificationEvent.USER_ROLE_ADDED]) =>
            `You have been assigned the ${data.role} role.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.USER_ROLE_REMOVED]: {
        title: () => 'Role Removed',
        message: (data: NotificationEventData[NotificationEvent.USER_ROLE_REMOVED]) =>
            `The ${data.role} role has been removed from your account.`,
        type: NotificationType.WARNING,
    },

    // Gym Events
    [NotificationEvent.GYM_CREATED]: {
        title: () => 'Gym Created',
        message: (data: NotificationEventData[NotificationEvent.GYM_CREATED]) =>
            `Your gym "${data.gymName}" has been successfully created.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.GYM_UPDATED]: {
        title: () => 'Gym Updated',
        message: (data: NotificationEventData[NotificationEvent.GYM_UPDATED]) =>
            `Your gym "${data.gymName}" has been updated successfully.`,
        type: NotificationType.INFO,
    },
    [NotificationEvent.GYM_DELETED]: {
        title: () => 'Gym Deleted',
        message: (data: NotificationEventData[NotificationEvent.GYM_DELETED]) =>
            `Your gym "${data.gymName}" has been deleted.`,
        type: NotificationType.WARNING,
    },
    [NotificationEvent.GYM_VERIFIED]: {
        title: () => 'Gym Verified',
        message: (data: NotificationEventData[NotificationEvent.GYM_VERIFIED]) =>
            `Your gym "${data.gymName}" has been verified by the admin.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.GYM_UNVERIFIED]: {
        title: () => 'Gym Unverified',
        message: (data: NotificationEventData[NotificationEvent.GYM_UNVERIFIED]) =>
            `Your gym "${data.gymName}" has been unverified by the admin.`,
        type: NotificationType.WARNING,
    },

    // Subscription Plan Events
    [NotificationEvent.PLAN_CREATED]: {
        title: () => 'New Plan Created',
        message: (data: NotificationEventData[NotificationEvent.PLAN_CREATED]) =>
            `New membership plan "${data.planName}" created at ${data.gymName} for ₹${data.price}.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.PLAN_UPDATED]: {
        title: () => 'Plan Updated',
        message: (data: NotificationEventData[NotificationEvent.PLAN_UPDATED]) =>
            `Membership plan "${data.planName}" at ${data.gymName} has been updated.`,
        type: NotificationType.INFO,
    },
    [NotificationEvent.PLAN_DELETED]: {
        title: () => 'Plan Deleted',
        message: (data: NotificationEventData[NotificationEvent.PLAN_DELETED]) =>
            `Membership plan "${data.planName}" at ${data.gymName} has been deleted.`,
        type: NotificationType.WARNING,
    },
    [NotificationEvent.PLAN_ACTIVATED]: {
        title: () => 'Plan Activated',
        message: (data: NotificationEventData[NotificationEvent.PLAN_ACTIVATED]) =>
            `Membership plan "${data.planName}" at ${data.gymName} is now active.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.PLAN_DEACTIVATED]: {
        title: () => 'Plan Deactivated',
        message: (data: NotificationEventData[NotificationEvent.PLAN_DEACTIVATED]) =>
            `Membership plan "${data.planName}" at ${data.gymName} has been deactivated.`,
        type: NotificationType.WARNING,
    },

    // Subscription Events
    [NotificationEvent.SUBSCRIPTION_CREATED]: {
        title: () => 'Subscription Created',
        message: (data: NotificationEventData[NotificationEvent.SUBSCRIPTION_CREATED]) =>
            `Your subscription to "${data.planName}" at ${data.gymName} has been created. Valid until ${new Date(data.endDate).toLocaleDateString()}.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.SUBSCRIPTION_ACTIVATED]: {
        title: () => 'Subscription Activated',
        message: (data: NotificationEventData[NotificationEvent.SUBSCRIPTION_ACTIVATED]) =>
            `Your subscription to "${data.planName}" at ${data.gymName} is now active. Your access code is ${data.accessCode}.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.SUBSCRIPTION_EXPIRED]: {
        title: () => 'Subscription Expired',
        message: (data: NotificationEventData[NotificationEvent.SUBSCRIPTION_EXPIRED]) =>
            `Your subscription to "${data.planName}" at ${data.gymName} has expired. Renew now to continue access.`,
        type: NotificationType.WARNING,
    },
    [NotificationEvent.SUBSCRIPTION_CANCELLED]: {
        title: () => 'Subscription Cancelled',
        message: (data: NotificationEventData[NotificationEvent.SUBSCRIPTION_CANCELLED]) =>
            `Your subscription to "${data.planName}" at ${data.gymName} has been cancelled.`,
        type: NotificationType.WARNING,
    },
    [NotificationEvent.SUBSCRIPTION_EXPIRING_SOON]: {
        title: () => 'Subscription Expiring Soon',
        message: (data: NotificationEventData[NotificationEvent.SUBSCRIPTION_EXPIRING_SOON]) =>
            `Your subscription to "${data.planName}" at ${data.gymName} expires in ${data.daysLeft} days. Renew now!`,
        type: NotificationType.WARNING,
    },

    // Payment Events
    [NotificationEvent.PAYMENT_INITIATED]: {
        title: () => 'Payment Initiated',
        message: (data: NotificationEventData[NotificationEvent.PAYMENT_INITIATED]) =>
            `Payment of ₹${data.amount} for "${data.planName}" has been initiated.`,
        type: NotificationType.INFO,
    },
    [NotificationEvent.PAYMENT_COMPLETED]: {
        title: () => 'Payment Successful',
        message: (data: NotificationEventData[NotificationEvent.PAYMENT_COMPLETED]) =>
            `Payment of ₹${data.amount} for "${data.planName}" completed successfully.${data.transactionId ? ` Transaction ID: ${data.transactionId}` : ''}`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.PAYMENT_FAILED]: {
        title: () => 'Payment Failed',
        message: (data: NotificationEventData[NotificationEvent.PAYMENT_FAILED]) =>
            `Payment of ₹${data.amount} for "${data.planName}" failed.${data.reason ? ` Reason: ${data.reason}` : ''}`,
        type: NotificationType.ERROR,
    },
    [NotificationEvent.PAYMENT_REFUNDED]: {
        title: () => 'Payment Refunded',
        message: (data: NotificationEventData[NotificationEvent.PAYMENT_REFUNDED]) =>
            `Payment of ₹${data.amount} has been refunded.${data.transactionId ? ` Transaction ID: ${data.transactionId}` : ''}`,
        type: NotificationType.INFO,
    },

    // Attendance Events
    [NotificationEvent.CHECKIN_SUCCESS]: {
        title: () => 'Check-in Successful',
        message: (data: NotificationEventData[NotificationEvent.CHECKIN_SUCCESS]) =>
            `Successfully checked in at ${data.gymName} at ${new Date(data.time).toLocaleTimeString()}.`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.CHECKIN_FAILED]: {
        title: () => 'Check-in Failed',
        message: (data: NotificationEventData[NotificationEvent.CHECKIN_FAILED]) =>
            `Check-in failed at ${data.gymName}. Reason: ${data.reason}`,
        type: NotificationType.ERROR,
    },
    [NotificationEvent.CHECKOUT_SUCCESS]: {
        title: () => 'Check-out Successful',
        message: (data: NotificationEventData[NotificationEvent.CHECKOUT_SUCCESS]) =>
            `Successfully checked out from ${data.gymName}. Session duration: ${data.duration}.`,
        type: NotificationType.SUCCESS,
    },

    // Settlement Events
    [NotificationEvent.SETTLEMENT_CREATED]: {
        title: () => 'Settlement Created',
        message: (data: NotificationEventData[NotificationEvent.SETTLEMENT_CREATED]) =>
            `Settlement of ₹${data.amount} created for ${data.gymName}.`,
        type: NotificationType.INFO,
    },
    [NotificationEvent.SETTLEMENT_PROCESSED]: {
        title: () => 'Settlement Processed',
        message: (data: NotificationEventData[NotificationEvent.SETTLEMENT_PROCESSED]) =>
            `Settlement of ₹${data.amount} for ${data.gymName} has been processed.${data.transactionId ? ` Transaction ID: ${data.transactionId}` : ''}`,
        type: NotificationType.SUCCESS,
    },
    [NotificationEvent.SETTLEMENT_FAILED]: {
        title: () => 'Settlement Failed',
        message: (data: NotificationEventData[NotificationEvent.SETTLEMENT_FAILED]) =>
            `Settlement of ₹${data.amount} for ${data.gymName} failed.${data.reason ? ` Reason: ${data.reason}` : ''}`,
        type: NotificationType.ERROR,
    },

    // System Events
    [NotificationEvent.SYSTEM_MAINTENANCE]: {
        title: () => 'Scheduled Maintenance',
        message: (data: NotificationEventData[NotificationEvent.SYSTEM_MAINTENANCE]) =>
            `System maintenance scheduled for ${new Date(data.scheduledTime).toLocaleString()}. Duration: ${data.duration}.`,
        type: NotificationType.WARNING,
    },
    [NotificationEvent.SYSTEM_UPDATE]: {
        title: () => 'System Update',
        message: (data: NotificationEventData[NotificationEvent.SYSTEM_UPDATE]) =>
            `System updated to version ${data.version}. New features: ${data.features.join(', ')}.`,
        type: NotificationType.INFO,
    },
    [NotificationEvent.SECURITY_ALERT]: {
        title: () => 'Security Alert',
        message: (data: NotificationEventData[NotificationEvent.SECURITY_ALERT]) =>
            `Security Alert (${data.severity.toUpperCase()}): ${data.message}`,
        type: NotificationType.ERROR,
    },
};
