import { Redis } from '@upstash/redis';
import logger from './logger';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    logger.warn('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be defined in .env file');
}

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
