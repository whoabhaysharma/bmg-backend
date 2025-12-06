import { Queue } from 'bullmq';
import logger from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Parse the URL to get host, port, password, etc. if needed,
// or simply pass the URL to the connection object if supported,
// but BullMQ `connection` usually takes { host, port } or an IORedis instance.
// The easiest way with BullMQ and a URL is using IORedis to parse it or manually.

// Actually BullMQ connection option is `ConnectionOptions` which extends `ioredis.RedisOptions`.
// We can use the parsed URL parts.
import { ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

// Helper to get connection options from URL if IORedis doesn't automatically handle it in the way BullMQ expects
// But wait, creating a new IORedis instance with the URL is the standard way.
// BullMQ takes `connection` which is `ConnectionOptions`.
// If we pass a URL string to IORedis it works, but BullMQ wants an object.

// Let's rely on IORedis parsing or just pass the object if we had one.
// Since we have a URL, let's extract the config.
// A simpler approach is to let IORedis handle the connection creation internally if we use a factory,
// but for the Queue constructor, we pass `{ connection: ... }`.

// Let's keep it simple.
const connection: ConnectionOptions = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false
});

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
