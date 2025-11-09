import { Router } from 'express';
import {
    createPlan,
    getPlansByGym,
    getPlanById,
    updatePlan,
    deletePlan,
    getActivePlansByGym,
} from '../controllers';
import { isAuthenticated } from '../middleware/isAuthenticated';
import { isOwner } from '../middleware/isOwner';
import { validate } from '../middleware/validate';

const router = Router();

// Create a new plan (Owner only)
router.post(
    '/gym/:gymId/plans',
    isAuthenticated,
    isOwner,
    validate,
    createPlan
);

// Get all plans for a gym
router.get('/gym/:gymId/plans', getPlansByGym);

// Get all active plans for a gym (public)
router.get('/gym/:gymId/plans/active', getActivePlansByGym);

// Get a single plan by ID
router.get('/plans/:planId', getPlanById);

// Update a plan (Owner only)
router.put(
    '/plans/:planId',
    isAuthenticated,
    isOwner,
    validate,
    updatePlan
);

// Delete a plan (Owner only)
router.delete(
    '/plans/:planId',
    isAuthenticated,
    isOwner,
    deletePlan
);

export default router;
