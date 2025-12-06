import { logAction, AuditLogData } from '../services/audit.service';
import { auditLogQueue } from '../lib/queue';

// Mock bullmq
jest.mock('../lib/queue', () => ({
  auditLogQueue: {
    add: jest.fn(),
    on: jest.fn(),
  },
  AUDIT_LOG_QUEUE_NAME: 'audit-logs',
}));

describe('Audit Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add audit log to queue', async () => {
    const logData: AuditLogData = {
      action: 'TEST_ACTION',
      entity: 'TestEntity',
      entityId: '123',
      actorId: 'user1',
      details: { foo: 'bar' }
    };

    await logAction(logData);

    expect(auditLogQueue.add).toHaveBeenCalledWith('audit-logs', logData);
  });
});
