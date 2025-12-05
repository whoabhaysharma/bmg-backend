import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller';
import { isAuthenticated } from '../middleware/isAuthenticated';

const router = Router();

router.get('/', isAuthenticated, getAuditLogs);

export default router;
