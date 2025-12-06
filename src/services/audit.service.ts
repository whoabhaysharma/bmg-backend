import { auditLogQueue, AUDIT_LOG_QUEUE_NAME } from '../lib/queue';
import logger from '../lib/logger';

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
