import express from 'express';
import { createGym, getGym, listGyms, updateGym } from '../controllers/gym.controller.js';
import { authenticate, authorizeOwner } from '../middlewares/auth.js';

const router = express.Router();

// Public routes
router.get('/', listGyms);
router.get('/:id', getGym);

// Protected routes
router.post('/', authenticate, authorizeOwner, createGym);
router.put('/:id', authenticate, updateGym);

export default router;