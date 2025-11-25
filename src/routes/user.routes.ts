import { Router } from 'express';
import {
    getMyProfile,
    updateMyProfile,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    restoreUser,
    addRole,
    getProfile,
} from '../controllers';
import { isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// User profile routes (me)
router.get('/me/profile', isAuthenticated, getMyProfile);
router.put('/me/profile', isAuthenticated, updateMyProfile);

// Admin routes
router.get('/', isAuthenticated, isAdmin, getAllUsers); // Get all users
router.get('/:id', isAuthenticated, getUserById); // Get user by ID
router.put('/:id', isAuthenticated, updateUser); // Update user
router.delete('/:id', isAuthenticated, deleteUser); // Soft delete user
router.post('/:id/restore', isAuthenticated, isAdmin, restoreUser); // Restore user (changed to POST)
router.post('/:id/role', isAuthenticated, isAdmin, addRole); // Add or remove role from user

// Extended profile route
router.get('/:id/profile', isAuthenticated, getProfile); // Get extended profile

export default router;
