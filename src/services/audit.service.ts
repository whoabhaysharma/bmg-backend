import { auditLogQueue, AUDIT_LOG_QUEUE_NAME } from '@queues/auditLogQueue';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

export interface AuditLogData {
  action: string;
  entity: string;
  entityId: string;
  actorId: string;
  gymId?: string;
  details?: Record<string, any>;
}

/**
 * Logs an action to the audit system.
 * This function is non-blocking and pushes the log to a background queue.
 *
 * @param data AuditLogData
 */
export const logAction = async (data: AuditLogData) => {
  try {
    await auditLogQueue.add(AUDIT_LOG_QUEUE_NAME, data);
  } catch (error) {
    // We log the error but don't throw it to avoid blocking the main flow
    logger.error('Failed to queue audit log:', error);
  }
};

export const auditService = {
  logAction,

  async getGymAuditLogs(gymId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { gymId },
        include: {
          actor: {
            select: { id: true, name: true, mobileNumber: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: { gymId } }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  },

  async getAllAuditLogs(filters: { entity?: string; action?: string; gymId?: string; page?: number; limit?: number }) {
    const { entity, action, gymId, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (gymId) where.gymId = gymId;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, mobileNumber: true }
          },
          gym: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  },

  async getMyAuditLogs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { actorId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: { actorId: userId } }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }
};
