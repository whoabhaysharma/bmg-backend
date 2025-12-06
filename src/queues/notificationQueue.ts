import { Queue } from 'bullmq';
import { redisConnectionConfig } from '../lib/redis';
import IORedis from 'ioredis';

const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const NOTIFICATION_QUEUE_NAME = 'notification-queue';

export const notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
    connection,
});
