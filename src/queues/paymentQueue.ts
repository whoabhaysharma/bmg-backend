import { Queue } from 'bullmq';
import { redisConnectionConfig } from '../lib/redis';
import IORedis from 'ioredis';

const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const QUEUE_NAME = 'payment-events';

export const queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

export const add = async (event: any) => {
    await queue.add('payment_event', event);
};
