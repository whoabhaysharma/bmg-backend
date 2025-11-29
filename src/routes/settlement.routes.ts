import { Router } from 'express';
import { createSettlement, getSettlements, getSettlementById, processSettlement, getUnsettledAmount } from '../controllers';
import { isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// Admin only routes
router.post('/', isAuthenticated, isAdmin, createSettlement);
router.patch('/:id/process', isAuthenticated, isAdmin, processSettlement);

// Admin & Owner routes
router.get('/', isAuthenticated, getSettlements);
router.get('/unsettled', isAuthenticated, getUnsettledAmount);
router.get('/:id', isAuthenticated, getSettlementById);

export default router;
