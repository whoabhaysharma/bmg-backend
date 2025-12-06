import { Router } from 'express';
import { settlementController } from "@controllers";
import { isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// Admin only routes
router.post('/', isAuthenticated, isAdmin, settlementController.createSettlement);
router.patch('/:id/process', isAuthenticated, isAdmin, settlementController.processSettlement);

// Admin & Owner routes
router.get('/', isAuthenticated, settlementController.getSettlements);
router.get('/unsettled-summary', isAuthenticated, isAdmin, settlementController.getUnsettledSummary);
router.get('/unsettled', isAuthenticated, settlementController.getUnsettledAmount);
router.get('/:id', isAuthenticated, settlementController.getSettlementById);

export default router;
