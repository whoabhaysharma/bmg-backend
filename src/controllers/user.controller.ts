import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Get my profile
export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  logger.info(`Fetching profile for user ${req.user.userId}`);
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
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
      logger.warn(`User not found for id: ${req.user.userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const roles = user.userRoles.map((userRole) => userRole.role);
    const userProfile = { ...user, userRoles: roles };

    res.json(userProfile);
  } catch (error) {
    logger.error(`Error fetching profile for user ${req.user.userId}: ${error}`);
    next(error);
  }
};

// Update my profile (with optional roles)
export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  logger.info(`Updating profile for user ${req.user.userId}`);
  try {
    const { name, mobileNumber, roles } = req.body;

    // Validate roles if provided
    if (roles) {
      if (!Array.isArray(roles) || roles.length === 0) {
        logger.warn(`Invalid roles format for user ${req.user.userId}`);
        return res.status(400).json({
          message: 'Roles must be a non-empty array',
        });
      }

      const validRoles = ['OWNER', 'USER'];
      const invalidRoles = roles.filter((role) => !validRoles.includes(role));

      if (invalidRoles.length > 0) {
        logger.warn(`Invalid roles provided for user ${req.user.userId}: ${invalidRoles.join(', ')}`);
        return res.status(400).json({
          message: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`,
        });
      }

      // Remove all existing roles and create new ones
      await prisma.userRole.deleteMany({
        where: {
          userId: req.user.userId,
        },
      });

      await prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: req.user.userId,
          role,
        })),
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: req.user.userId,
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

    const rolesList = updatedUser.userRoles.map((userRole) => userRole.role);
    const userProfile = { ...updatedUser, userRoles: rolesList };

    res.json(userProfile);
  } catch (error) {
    logger.error(`Error updating profile for user ${req.user.userId}: ${error}`);
    next(error);
  }
};