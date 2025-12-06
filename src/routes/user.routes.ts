import { Router } from 'express';
import { userController } from "@controllers";
import { isAuthenticated, isAdmin } from '../middleware';

const router = Router();

// User profile routes (me)
router.get('/me/profile', isAuthenticated, userController.getMyProfile);
router.put('/me/profile', isAuthenticated, userController.updateMyProfile);
router.post('/me/upgrade-to-owner', isAuthenticated, userController.upgradeToOwner);

// Admin routes
router.get('/', isAuthenticated, isAdmin, userController.getAllUsers); // Get all users
router.get('/:id', isAuthenticated, userController.getUserById); // Get user by ID
router.put('/:id', isAuthenticated, userController.updateUser); // Update user
router.delete('/:id', isAuthenticated, userController.deleteUser); // Soft delete user
router.post('/:id/restore', isAuthenticated, isAdmin, userController.restoreUser); // Restore user (changed to POST)
router.post('/:id/role', isAuthenticated, isAdmin, userController.addRole); // Add or remove role from user

// Extended profile route
router.get('/:id/profile', isAuthenticated, userController.getProfile); // Get extended profile

export default router;
