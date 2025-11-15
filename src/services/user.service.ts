import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { Role } from '@prisma/client';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  mobileNumber: string | null;
  googleId: string | null;
  userRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileData {
  name?: string;
  mobileNumber?: string;
  roles?: Role[];
}

/**
 * Service class for user management operations
 * Handles user profiles and role management for ADMIN, OWNER, and USER types
 */
export class UserService {
  /**
   * Get user profile by ID
   * @param userId - User ID to fetch
   * @returns User profile with roles
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    logger.info({ msg: 'Fetching user profile', userId });

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        googleId: true,
        userRoles: {
          select: {
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      logger.warn({ msg: 'User not found', userId });
      return null;
    }

    const roles = dbUser.userRoles.map((userRole) => userRole.role);
    const userProfile = { ...dbUser, userRoles: roles };

    logger.info({
      msg: 'Successfully fetched user profile',
      userId,
      rolesCount: roles.length,
    });

    return userProfile;
  }

  /**
   * Update user profile and optionally assign roles
   * Note: ADMIN role can only be assigned by existing ADMIN users (enforced in controller/middleware)
   * Users can self-assign OWNER and USER roles
   * @param userId - User ID to update
   * @param data - Update data including name, mobile, and roles
   * @returns Updated user profile
   */
  async updateUserProfile(
    userId: string,
    data: UpdateUserProfileData
  ): Promise<UserProfile> {
    logger.info({ msg: 'Updating user profile', userId });

    const { name, mobileNumber, roles } = data;

    // Validate and update roles if provided
    if (roles) {
      await this.updateUserRoles(userId, roles);
    }

    // Update user basic info
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(mobileNumber !== undefined && { mobileNumber }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        googleId: true,
        userRoles: {
          select: {
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    const rolesList = updatedUser.userRoles.map((userRole) => userRole.role);
    const userProfile = { ...updatedUser, userRoles: rolesList };

    logger.info({
      msg: 'Successfully updated user profile',
      userId,
      rolesCount: rolesList.length,
    });

    return userProfile;
  }

  /**
   * Update user roles - replaces all existing roles with new ones
   * @param userId - User ID
   * @param roles - Array of roles to assign
   */
  private async updateUserRoles(userId: string, roles: Role[]): Promise<void> {
    if (!Array.isArray(roles) || roles.length === 0) {
      logger.warn({
        msg: 'Invalid roles format',
        userId,
        providedRoles: roles,
      });
      throw new Error('Roles must be a non-empty array');
    }

    // Validate roles
    const validRoles = Object.values(Role);
    const invalidRoles = roles.filter((role) => !validRoles.includes(role));

    if (invalidRoles.length > 0) {
      logger.warn({
        msg: 'Invalid roles provided',
        userId,
        invalidRoles,
      });
      throw new Error(
        `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
      );
    }

    // Remove all existing roles and create new ones
    await prisma.userRole.deleteMany({
      where: { userId },
    });

    await prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        role,
      })),
    });

    logger.info({ msg: 'Replaced user roles', userId, newRoles: roles });
  }

  /**
   * Check if user has a specific role
   * @param userId - User ID to check
   * @param role - Role to check for
   * @returns True if user has the role
   */
  async hasRole(userId: string, role: Role): Promise<boolean> {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role,
      },
    });

    return !!userRole;
  }

  /**
   * Get all users with a specific role (typically used by ADMIN)
   * @param role - Role to filter by
   * @returns List of users with the specified role
   */
  async getUsersByRole(role: Role): Promise<UserProfile[]> {
    logger.info({ msg: 'Fetching users by role', role });

    const users = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobileNumber: true,
        googleId: true,
        userRoles: {
          select: {
            role: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return users.map((user) => ({
      ...user,
      userRoles: user.userRoles.map((ur) => ur.role),
    }));
  }

  /**
   * Assign role to user (typically used by ADMIN)
   * @param userId - User ID
   * @param role - Role to assign
   */
  async assignRole(userId: string, role: Role): Promise<void> {
    logger.info({ msg: 'Assigning role to user', userId, role });

    // Check if role already exists
    const existingRole = await prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
    });

    if (existingRole) {
      logger.info({ msg: 'Role already assigned', userId, role });
      return;
    }

    await prisma.userRole.create({
      data: {
        userId,
        role,
      },
    });

    logger.info({ msg: 'Successfully assigned role', userId, role });
  }

  /**
   * Remove role from user (typically used by ADMIN)
   * @param userId - User ID
   * @param role - Role to remove
   */
  async removeRole(userId: string, role: Role): Promise<void> {
    logger.info({ msg: 'Removing role from user', userId, role });

    await prisma.userRole.deleteMany({
      where: {
        userId,
        role,
      },
    });

    logger.info({ msg: 'Successfully removed role', userId, role });
  }
}

export const userService = new UserService();
