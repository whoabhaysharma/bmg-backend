import Redis from 'ioredis';
import logger from './logger';

if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL is not defined in .env file, using default redis://localhost:6379');
}

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('connect', () => {
    logger.info('Successfully connected to Redis');
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});
