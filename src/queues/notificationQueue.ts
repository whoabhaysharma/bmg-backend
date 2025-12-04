import { Queue } from 'bullmq';
import { connection } from '../config/queue';

export const NOTIFICATION_QUEUE_NAME = 'notification-queue';

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
    connection,
});
