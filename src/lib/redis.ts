import Redis, { RedisOptions } from 'ioredis';
import logger from './logger';

import { config } from '../config/config';

if (!config.redis.url) {
    logger.warn('REDIS_URL is not defined in .env file, using default redis://localhost:6379');
}

const redisUrl = config.redis.url;

export const redisOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

// If using a URL, we can pass it as the first argument, but for options reuse we might want to parse it or just rely on the URL string being available.
// However, BullMQ prefers options object.
// Let's keep it simple: export the URL and options.

export const redisConnectionConfig = {
    url: redisUrl,
    options: redisOptions
};

export const redis = new Redis(redisUrl, redisOptions);

redis.on('connect', () => {
    logger.info('Successfully connected to Redis');
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});
