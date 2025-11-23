import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { Role } from '@prisma/client';

import { AuthenticatedRequest } from '../middleware';

export const getMyProfile = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const profile = await userService.getUserProfileWithRelations(authReq.user.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const updateData = { ...req.body };
    delete updateData.roles;
    delete updateData.gymsOwned;

    const updatedUser = await userService.updateUser(authReq.user.id, updateData);
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update profile' });
  }
};

export class UserController {

  /**
   * Create a new user
   * Auth: Public (Registration) or Admin
   */
  async createUser(req: Request, res: Response) {
    try {
      // Note: If this is public registration, you might want to force 
      // role to USER inside the service or here to prevent role escalation.
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create user', details: error });
    }
  }

  /**
   * Get all users
   * Auth: ADMIN only
   */
  async getAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const currentUser = req.user;

      if (!currentUser || !currentUser.roles.includes(Role.ADMIN)) {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const includeDeleted = req.query.includeDeleted === 'true';

      const result = await userService.getAllUsers(page, limit, includeDeleted);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  /**
   * Get single user by ID
   * Auth: ADMIN or The User Themselves
   */
  async getUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const isSelf = currentUser.id === id;
      const isAdmin = currentUser.roles.includes(Role.ADMIN);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden: You can only view your own data' });
      }

      const user = await userService.getUserById(id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  /**
   * Update user
   * Auth: ADMIN or The User Themselves
   */
  async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const isSelf = currentUser.id === id;
      const isAdmin = currentUser.roles.includes(Role.ADMIN);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Security: Prevent non-admins from updating sensitive fields
      const updateData = { ...req.body };

      if (!isAdmin) {
        // A regular user cannot change their own roles or gym ownership
        delete updateData.roles;
        delete updateData.gymsOwned;
      }

      const updatedUser = await userService.updateUser(id, updateData);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update user' });
    }
  }

  /**
   * Soft Delete user
   * Auth: ADMIN or The User Themselves
   */
  async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const isSelf = currentUser.id === id;
      const isAdmin = currentUser.roles.includes(Role.ADMIN);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await userService.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * Restore user
   * Auth: ADMIN only
   */
  async restoreUser(req: AuthenticatedRequest, res: Response) {
    try {
      const currentUser = req.user;

      if (!currentUser || !currentUser.roles.includes(Role.ADMIN)) {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      const { id } = req.params;
      const user = await userService.restoreUser(id);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: 'Failed to restore user' });
    }
  }

  /**
   * Add Role to user (e.g. Upgrade to Owner)
   * Auth: ADMIN only
   * Route: POST /users/:id/role
   */
  async addRole(req: AuthenticatedRequest, res: Response) {
    try {
      const currentUser = req.user;

      if (!currentUser || !currentUser.roles.includes(Role.ADMIN)) {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      const { id } = req.params; // Get user ID from URL params
      const { role } = req.body; // Get role from request body

      if (!Object.values(Role).includes(role)) {
        return res.status(400).json({ error: 'Invalid role provided' });
      }

      const user = await userService.addRole(id, role);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: 'Failed to add role' });
    }
  }

  /**
   * Get Extended Profile with Gyms/Subs
   * Auth: ADMIN or The User Themselves
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      // Allows route like /users/me/profile or /users/:id/profile
      const id = req.params.id === 'me' ? req.user?.id : req.params.id;

      if (!id) return res.status(400).json({ error: 'User ID required' });

      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

      const isSelf = currentUser.id === id;
      const isAdmin = currentUser.roles.includes(Role.ADMIN);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const profile = await userService.getUserProfileWithRelations(id);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
}

export const userController = new UserController();

// Export individual methods as standalone functions for use in routes
export const getAllUsers = async (req: any, res: Response) => userController.getAllUsers(req, res);
export const deleteUser = async (req: any, res: Response) => userController.deleteUser(req, res);
export const restoreUser = async (req: any, res: Response) => userController.restoreUser(req, res);
export const addRole = async (req: any, res: Response) => userController.addRole(req, res);
export const getProfile = async (req: any, res: Response) => userController.getProfile(req, res);