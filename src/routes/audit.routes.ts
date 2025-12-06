import { Router } from 'express';
import { auditController } from "@controllers";
import { isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// Get logs for a specific gym (Owner or Admin)
// Note: We need to verify ownership inside the controller or middleware.
// `isOwner` middleware usually checks `req.params.gymId`.
router.get('/gym/:gymId', isAuthenticated, auditController.getGymAuditLogs);

// Get all logs (Admin only)
router.get('/admin/all', isAuthenticated, isAdmin, auditController.getAllAuditLogs);

// Get my logs
router.get('/me', isAuthenticated, auditController.getMyAuditLogs);

export default router;
