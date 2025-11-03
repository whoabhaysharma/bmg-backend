
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Get my profile

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  logger.info(`Fetching profile for user ${req.user.id}`);
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
      logger.warn(`User not found for id: ${req.user.id}`);
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found',
      });
    }

    const roles = user.userRoles.map((userRole: { role: string }) => userRole.role);
    const userProfile = { ...user, userRoles: roles };

    logger.info(`Successfully fetched profile for user ${req.user.id}`);
    return res.status(200).json({
      success: true,
      data: userProfile,
      error: null,
    });
  } catch (error) {
    logger.error(`Error fetching profile for user ${req.user.id}: ${error}`);
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
  logger.info(`Updating profile for user ${req.user.id}`);
  try {
    const { name, mobileNumber, roles } = req.body;

    // Validate roles if provided
    if (roles) {
      if (!Array.isArray(roles) || roles.length === 0) {
        logger.warn(`Invalid roles format for user ${req.user.id}`);
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Roles must be a non-empty array',
        });
      }

      const validRoles = ['OWNER', 'USER'];
      const invalidRoles = roles.filter((role: string) => !validRoles.includes(role));

      if (invalidRoles.length > 0) {
        logger.warn(
          `Invalid roles provided for user ${req.user.id}: ${invalidRoles.join(', ')}`
        );
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

    logger.info(`Successfully updated profile for user ${req.user.id}`);
    return res.status(200).json({
      success: true,
      data: userProfile,
      error: null,
    });
  } catch (error) {
    logger.error(`Error updating profile for user ${req.user.id}: ${error}`);
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};
