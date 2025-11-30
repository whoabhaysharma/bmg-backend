import { Router } from 'express';
import {
    createApiKey,
    getAllApiKeys,
    deleteApiKey,
    toggleApiKeyStatus,
} from '../controllers';
import { isAuthenticated, authorize } from '../middleware';
import { Role } from '@prisma/client';

const router = Router();

// All routes require ADMIN role
router.use(isAuthenticated, authorize([Role.ADMIN]));

router.post('/', createApiKey);
router.get('/', getAllApiKeys);
router.delete('/:id', deleteApiKey);
router.patch('/:id/status', toggleApiKeyStatus);

export default router;
