import { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

export const connection: ConnectionOptions = {
    url: process.env.REDIS_URL,
};
