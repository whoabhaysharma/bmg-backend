import { Queue } from 'bullmq';
import { redisConnectionConfig } from '../lib/redis';
import IORedis from 'ioredis';

const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const QUEUE_NAME = 'notification-queue';

export const queue = new Queue(QUEUE_NAME, {
    connection,
});

export const add = async (name: string, data: any) => {
    await queue.add(name, data);
};
