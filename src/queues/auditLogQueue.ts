import { Queue } from 'bullmq';
import logger from '../lib/logger';
import { redisConnectionConfig } from '../lib/redis';
import IORedis from 'ioredis';

// Create a dedicated connection for the queue manager
const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const AUDIT_LOG_QUEUE_NAME = 'audit-logs';

export const auditLogQueue = new Queue(AUDIT_LOG_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 24 * 3600, // Keep failed jobs for 24h
    },
});

auditLogQueue.on('error', (err) => {
    logger.error('Audit Log Queue Error:', err);
});
