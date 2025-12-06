import { Router } from 'express';
import { Role } from '@prisma/client';
import { planController } from "@controllers";
import { isAuthenticated, authorize, validate } from '../middleware';
import { planCreateSchema, planUpdateSchema } from '../types/schemas';

const router = Router();

// Create a new plan (Owner or Admin only)
router.post(
    '/',
    isAuthenticated,
    authorize([Role.OWNER, Role.ADMIN]),
    validate({ body: planCreateSchema }),
    planController.createPlan
);

// Get all plans for a gym (by query parameter)
router.get('/', isAuthenticated, planController.getAllPlans);

// Get active plans for a gym (by query parameter)
router.get('/active', isAuthenticated, planController.getActivePlansByGym);

// Get a single plan by ID
router.get('/:planId', isAuthenticated, planController.getPlanById);

// Update a plan (Owner or Admin only)
router.put(
    '/:planId',
    isAuthenticated,
    authorize([Role.OWNER, Role.ADMIN]),
    validate({ body: planUpdateSchema }),
    planController.updatePlan
);

// Delete a plan (Owner or Admin only)
router.delete(
    '/:planId',
    isAuthenticated,
    authorize([Role.OWNER, Role.ADMIN]),
    planController.deletePlan
);

export default router;
