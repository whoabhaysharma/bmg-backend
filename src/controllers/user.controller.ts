
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Get my profile

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  logger.info({ msg: 'Fetching user profile', userId: req.user?.id });
  if (!req.user || !req.user.id) {
    logger.error({ msg: 'Missing user id in request', user: req.user });
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Unauthorized: user id missing',
    });
  }
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
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

    if (!user) {
      logger.warn({ msg: 'User not found', userId: req.user.id });
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found',
      });
    }

    const roles = user.userRoles.map((userRole: { role: string }) => userRole.role);
    const userProfile = { ...user, userRoles: roles };

    logger.info({ msg: 'Successfully fetched user profile', userId: req.user.id, rolesCount: roles.length });
    return res.status(200).json({
      success: true,
      data: userProfile,
      error: null,
    });
  } catch (error) {
    logger.error({
      msg: 'Error fetching user profile',
      userId: req.user.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};

// Update my profile (with optional roles)

export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  logger.info({ msg: 'Updating user profile', userId: req.user?.id });
  if (!req.user || !req.user.id) {
    logger.error({ msg: 'Missing user id in request', user: req.user });
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Unauthorized: user id missing',
    });
  }
  try {
    const { name, mobileNumber, roles } = req.body;

    // Validate roles if provided
    if (roles) {
      if (!Array.isArray(roles) || roles.length === 0) {
        logger.warn({ msg: 'Invalid roles format', userId: req.user.id, providedRoles: roles });
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Roles must be a non-empty array',
        });
      }

      const validRoles = ['OWNER', 'USER'];
      const invalidRoles = roles.filter((role: string) => !validRoles.includes(role));

      if (invalidRoles.length > 0) {
        logger.warn({
          msg: 'Invalid roles provided',
          userId: req.user.id,
          invalidRoles: invalidRoles,
        });
        return res.status(400).json({
          success: false,
          data: null,
          error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`,
        });
      }

      // Remove all existing roles and create new ones
      await prisma.userRole.deleteMany({
        where: {
          userId: req.user.id,
        },
      });

      // Ensure roles are cast to the correct enum type if needed
      await prisma.userRole.createMany({
        data: roles.map((role: string) => ({
          userId: req.user.id,
          role: role as any, // Cast to 'any' to bypass type error, or use 'as Role' if Role enum is imported
        })),
      });
      logger.info({ msg: 'Replaced user roles', userId: req.user.id, newRoles: roles });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        name,
        mobileNumber,
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

    const rolesList = updatedUser.userRoles.map((userRole: { role: string }) => userRole.role);
    const userProfile = { ...updatedUser, userRoles: rolesList };

    logger.info({ msg: 'Successfully updated user profile', userId: req.user.id, rolesCount: rolesList.length });
    return res.status(200).json({
      success: true,
      data: userProfile,
      error: null,
    });
  } catch (error) {
    logger.error({
      msg: 'Error updating user profile',
      userId: req.user.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};
