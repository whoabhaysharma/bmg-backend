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

// Create a new plan for a gym (Owner only)
router.post(
    '/gym/:gymId',
    isAuthenticated,
    isOwner,
    validate,
    createPlan
);

// Get all plans for a gym
router.get('/gym/:gymId', getPlansByGym);

// Get active plans for a gym
router.get('/gym/:gymId/active', getActivePlansByGym);

// Get a single plan by ID
router.get('/:planId', getPlanById);

// Update a plan (Owner only)
router.put(
    '/:planId',
    isAuthenticated,
    isOwner,
    validate,
    updatePlan
);

// Delete a plan (Owner only)
router.delete(
    '/:planId',
    isAuthenticated,
    isOwner,
    deletePlan
);

export default router;
