import { Request, Response } from 'express';
import { userService } from '../services';
import { Role } from '@prisma/client';

import { AuthenticatedRequest } from '../middleware';
import { getAuthUser } from '../utils/getAuthUser';
import { sendSuccess, sendUnauthorized, sendForbidden, sendNotFound, sendInternalError, sendBadRequest } from '../utils/response';

export const getMyProfile = async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return sendUnauthorized(res);
  try {
    const profile = await userService.getUserProfileWithRelations(user.id);
    if (!profile) return sendNotFound(res, 'Profile not found');
    return sendSuccess(res, profile);
  } catch (error) {
    return sendInternalError(res, 'Failed to fetch profile');
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return sendUnauthorized(res);
  try {
    const updateData = { name: req.body.name }; // Only allow updating the name
    const updatedUser = await userService.updateUser(user.id, updateData);
    return sendSuccess(res, updatedUser);
  } catch (error) {
    return sendBadRequest(res, 'Failed to update profile');
  }
};

/**
 * Create a new user
 * Auth: Public (Registration) or Admin
 */
export const createUser = async (req: Request, res: Response) => {
  try {
    // Note: If this is public registration, you might want to force
    // role to USER inside the service or here to prevent role escalation.
    const user = await userService.createUser(req.body);
    return sendSuccess(res, user, 201);
  } catch (error) {
    return sendBadRequest(res, 'Failed to create user');
  }
};

/**
 * Get all users
 * Auth: ADMIN only
 */
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = getAuthUser(req);
    if (!currentUser || !currentUser.roles.includes(Role.ADMIN)) {
      return sendForbidden(res, 'Forbidden: Admins only');
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const includeDeleted = req.query.includeDeleted === 'true';

    const result = await userService.getAllUsers(page, limit, includeDeleted);
    return sendSuccess(res, result);
  } catch (error) {
    return sendInternalError(res, 'Failed to fetch users');
  }
};

/**
 * Get single user by ID
 * Auth: ADMIN or The User Themselves
 */
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = getAuthUser(req);
    if (!currentUser) return sendUnauthorized(res);

    const isSelf = currentUser.id === id;
    const isAdmin = currentUser.roles.includes(Role.ADMIN);

    if (!isSelf && !isAdmin) {
      return sendForbidden(res, 'Forbidden: You can only view your own data');
    }

    const user = await userService.getUserById(id);
    if (!user) return sendNotFound(res, 'User not found');

    return sendSuccess(res, user);
  } catch (error) {
    return sendInternalError(res, 'Failed to fetch user');
  }
};

/**
 * Update user
 * Auth: ADMIN or The User Themselves
 */
export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = getAuthUser(req);
    if (!currentUser) return sendUnauthorized(res);

    const isSelf = currentUser.id === id;
    const isAdmin = currentUser.roles.includes(Role.ADMIN);

    if (!isSelf && !isAdmin) {
      return sendForbidden(res);
    }

    // Security: Prevent non-admins from updating sensitive fields
    const updateData = { ...req.body };

    if (!isAdmin) {
      // A regular user cannot change their own roles or gym ownership
      delete updateData.roles;
      delete updateData.gymsOwned;
    }

    const updatedUser = await userService.updateUser(id, updateData);
    return sendSuccess(res, updatedUser);
  } catch (error) {
    return sendBadRequest(res, 'Failed to update user');
  }
};

/**
 * Soft Delete user
 * Auth: ADMIN or The User Themselves
 */
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = getAuthUser(req);
    if (!currentUser) return sendUnauthorized(res);

    const isSelf = currentUser.id === id;
    const isAdmin = currentUser.roles.includes(Role.ADMIN);

    if (!isSelf && !isAdmin) {
      return sendForbidden(res);
    }

    await userService.deleteUser(id);
    return sendSuccess(res, { message: 'User deleted successfully' });
  } catch (error) {
    return sendBadRequest(res, 'Failed to delete user');
  }
};

/**
 * Restore user
 * Auth: ADMIN only
 */
export const restoreUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = getAuthUser(req);
    if (!currentUser || !currentUser.roles.includes(Role.ADMIN)) {
      return sendForbidden(res, 'Forbidden: Admins only');
    }

    const { id } = req.params;
    const user = await userService.restoreUser(id);
    return sendSuccess(res, user);
  } catch (error) {
    return sendBadRequest(res, 'Failed to restore user');
  }
};

/**
 * Add or Remove Role to user
 * Auth: ADMIN only
 * Route: POST /users/:id/role
 */
export const addRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = getAuthUser(req);
    if (!currentUser || !currentUser.roles.includes(Role.ADMIN)) {
      return sendForbidden(res, 'Forbidden: Admins only');
    }

    const { id } = req.params; // User ID
    const { role, action } = req.body; // Role and action (add or remove)

    if (!role || !['add', 'remove'].includes(action)) {
      return sendBadRequest(res, 'Invalid role or action');
    }

    const user = await userService.getUserById(id);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    let updatedUser;
    if (action === 'add') {
      updatedUser = await userService.addRole(id, role);
    } else if (action === 'remove') {
      updatedUser = await userService.removeRole(id, role);
    }

    return sendSuccess(res, updatedUser);
  } catch (error: any) {
    return sendInternalError(res, 'Failed to update role');
  }
};

/**
 * Get Extended Profile with Gyms/Subs
 * Auth: ADMIN or The User Themselves
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Allows route like /users/me/profile or /users/:id/profile
    const currentUser = getAuthUser(req);
    const id = req.params.id === 'me' ? currentUser?.id : req.params.id;

    if (!id) return sendBadRequest(res, 'User ID required');
    if (!currentUser) return sendUnauthorized(res);

    const isSelf = currentUser.id === id;
    const isAdmin = currentUser.roles.includes(Role.ADMIN);

    if (!isSelf && !isAdmin) {
      return sendForbidden(res);
    }

    const profile = await userService.getUserProfileWithRelations(id);
    if (!profile) return sendNotFound(res, 'Profile not found');

    return sendSuccess(res, profile);
  } catch (error) {
    return sendInternalError(res, 'Failed to fetch profile');
  }
};
/**
 * Upgrade current user to OWNER
 * Auth: Authenticated User
 */
export const upgradeToOwner = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return sendUnauthorized(res);

    // Check if already owner
    if (user.roles.includes(Role.OWNER)) {
      return sendBadRequest(res, 'User is already an owner');
    }

    const updatedUser = await userService.addRole(user.id, Role.OWNER);
    return sendSuccess(res, updatedUser);
  } catch (error) {
    return sendInternalError(res, 'Failed to upgrade to owner');
  }
};
