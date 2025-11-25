import { Router } from 'express';
import {
    getMyProfile,
    updateMyProfile,
    getAllUsers,
    deleteUser,
    restoreUser,
    addRole,
    getProfile,
} from '../controllers';
import { isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// User profile routes
router.get('/profile', isAuthenticated, getMyProfile);
router.put('/profile', isAuthenticated, updateMyProfile);

// Admin routes
router.get('/', isAuthenticated, isAdmin, getAllUsers); // Get all users
router.delete('/:id', isAuthenticated, isAdmin, deleteUser); // Soft delete user
router.patch('/:id/restore', isAuthenticated, isAdmin, restoreUser); // Restore user
router.post('/:id/role', isAuthenticated, isAdmin, addRole); // Add or remove role from user

// Extended profile route
router.get('/:id/profile', isAuthenticated, getProfile); // Get extended profile

export default router;
