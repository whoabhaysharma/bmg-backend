import { logAction, AuditLogData } from '../services/audit.service';
import { queue } from '../queues/auditLogQueue';

// Mock bullmq
jest.mock('../queues/auditLogQueue', () => ({
  queue: {
    add: jest.fn(),
    on: jest.fn(),
  },
  QUEUE_NAME: 'audit-logs',
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

    expect(queue.add).toHaveBeenCalledWith('audit-logs', logData);
  });
});
