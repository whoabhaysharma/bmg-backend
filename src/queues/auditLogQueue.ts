import { Queue } from 'bullmq';
import logger from '../lib/logger';
import { redisConnectionConfig } from '../lib/redis';
import IORedis from 'ioredis';

// Create a dedicated connection for the queue manager
const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const QUEUE_NAME = 'audit-logs';

export const queue = new Queue(QUEUE_NAME, {
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

queue.on('error', (err: any) => {
    logger.error('Audit Log Queue Error:', err);
});

export const add = async (data: any) => {
    await queue.add(QUEUE_NAME, data);
};
