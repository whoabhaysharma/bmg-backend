/**
 * Centralized Notification Events
 * 
 * This enum defines all possible notification events in the system.
 * Add new events here as the application grows.
 */
export enum NotificationEvent {
    // User Events
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_DELETED = 'USER_DELETED',
    USER_RESTORED = 'USER_RESTORED',
    USER_ROLE_ADDED = 'USER_ROLE_ADDED',
    USER_ROLE_REMOVED = 'USER_ROLE_REMOVED',

    // Gym Events
    GYM_CREATED = 'GYM_CREATED',
    GYM_UPDATED = 'GYM_UPDATED',
    GYM_DELETED = 'GYM_DELETED',
    GYM_VERIFIED = 'GYM_VERIFIED',
    GYM_UNVERIFIED = 'GYM_UNVERIFIED',

    // Subscription Plan Events
    PLAN_CREATED = 'PLAN_CREATED',
    PLAN_UPDATED = 'PLAN_UPDATED',
    PLAN_DELETED = 'PLAN_DELETED',
    PLAN_ACTIVATED = 'PLAN_ACTIVATED',
    PLAN_DEACTIVATED = 'PLAN_DEACTIVATED',

    // Subscription Events
    SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
    SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
    SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
    SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
    SUBSCRIPTION_EXPIRING_SOON = 'SUBSCRIPTION_EXPIRING_SOON',
    MEMBER_ADDED = 'MEMBER_ADDED',

    // Payment Events
    PAYMENT_INITIATED = 'PAYMENT_INITIATED',
    PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',

    // Attendance Events
    CHECKIN_SUCCESS = 'CHECKIN_SUCCESS',
    CHECKIN_FAILED = 'CHECKIN_FAILED',
    CHECKOUT_SUCCESS = 'CHECKOUT_SUCCESS',

    // Settlement Events
    SETTLEMENT_CREATED = 'SETTLEMENT_CREATED',
    SETTLEMENT_PROCESSED = 'SETTLEMENT_PROCESSED',
    SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',

    // System Events
    SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
    SYSTEM_UPDATE = 'SYSTEM_UPDATE',
    SECURITY_ALERT = 'SECURITY_ALERT',
}

/**
 * Notification Event Metadata
 * 
 * Defines the structure of data passed with each event
 */
export interface NotificationEventData {
    [NotificationEvent.USER_CREATED]: { userName: string };
    [NotificationEvent.USER_UPDATED]: { userName: string };
    [NotificationEvent.USER_DELETED]: { userName: string };
    [NotificationEvent.USER_RESTORED]: { userName: string };
    [NotificationEvent.USER_ROLE_ADDED]: { userName: string; role: string };
    [NotificationEvent.USER_ROLE_REMOVED]: { userName: string; role: string };

    [NotificationEvent.GYM_CREATED]: { gymName: string };
    [NotificationEvent.GYM_UPDATED]: { gymName: string };
    [NotificationEvent.GYM_DELETED]: { gymName: string };
    [NotificationEvent.GYM_VERIFIED]: { gymName: string };
    [NotificationEvent.GYM_UNVERIFIED]: { gymName: string };

    [NotificationEvent.PLAN_CREATED]: { planName: string; gymName: string; price: number };
    [NotificationEvent.PLAN_UPDATED]: { planName: string; gymName: string };
    [NotificationEvent.PLAN_DELETED]: { planName: string; gymName: string };
    [NotificationEvent.PLAN_ACTIVATED]: { planName: string; gymName: string };
    [NotificationEvent.PLAN_DEACTIVATED]: { planName: string; gymName: string };

    [NotificationEvent.SUBSCRIPTION_CREATED]: { planName: string; gymName: string; endDate: Date };
    [NotificationEvent.SUBSCRIPTION_ACTIVATED]: { planName: string; gymName: string; accessCode: string };
    [NotificationEvent.SUBSCRIPTION_EXPIRED]: { planName: string; gymName: string };
    [NotificationEvent.SUBSCRIPTION_CANCELLED]: { planName: string; gymName: string };
    [NotificationEvent.SUBSCRIPTION_EXPIRING_SOON]: { planName: string; gymName: string; daysLeft: number };
    [NotificationEvent.MEMBER_ADDED]: { memberName: string; planName: string; gymName: string };

    [NotificationEvent.PAYMENT_INITIATED]: { amount: number; planName: string };
    [NotificationEvent.PAYMENT_COMPLETED]: { amount: number; planName: string; transactionId?: string };
    [NotificationEvent.PAYMENT_FAILED]: { amount: number; planName: string; reason?: string };
    [NotificationEvent.PAYMENT_REFUNDED]: { amount: number; transactionId?: string };

    [NotificationEvent.CHECKIN_SUCCESS]: { gymName: string; time: Date };
    [NotificationEvent.CHECKIN_FAILED]: { gymName: string; reason: string };
    [NotificationEvent.CHECKOUT_SUCCESS]: { gymName: string; duration: string };

    [NotificationEvent.SETTLEMENT_CREATED]: { amount: number; gymName: string };
    [NotificationEvent.SETTLEMENT_PROCESSED]: { amount: number; gymName: string; transactionId?: string };
    [NotificationEvent.SETTLEMENT_FAILED]: { amount: number; gymName: string; reason?: string };

    [NotificationEvent.SYSTEM_MAINTENANCE]: { scheduledTime: Date; duration: string };
    [NotificationEvent.SYSTEM_UPDATE]: { version: string; features: string[] };
    [NotificationEvent.SECURITY_ALERT]: { message: string; severity: 'low' | 'medium' | 'high' };
}
