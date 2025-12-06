import { Worker, Job } from 'bullmq';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AUDIT_LOG_QUEUE_NAME } from '../queues/auditLogQueue';
import { AuditLogData } from '../services/audit.service';
import { redisConnectionConfig } from '../lib/redis';
import IORedis from 'ioredis';

const connection = new IORedis(redisConnectionConfig.url, redisConnectionConfig.options);

export const initAuditWorker = () => {
  const worker = new Worker<AuditLogData>(
    AUDIT_LOG_QUEUE_NAME,
    async (job: Job<AuditLogData>) => {
      const { action, entity, entityId, actorId, gymId, details } = job.data;

      try {
        await prisma.auditLog.create({
          data: {
            action,
            entity,
            entityId,
            actorId,
            gymId,
            details: details || {},
          },
        });
      } catch (error) {
        logger.error(`Failed to write audit log for job ${job.id}:`, error);
        throw error; // Throwing allows BullMQ to retry based on config
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 logs in parallel
      limiter: {
        max: 100, // Max 100 jobs
        duration: 1000, // per 1 second
      }
    }
  );

  worker.on('completed', () => {
    // logger.info(`Audit log job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Audit log job ${job?.id} failed with ${err.message}`);
  });

  logger.info('Audit Worker initialized');
  return worker;
};
