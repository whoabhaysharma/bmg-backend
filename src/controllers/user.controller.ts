
import type { RequestHandler } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { Role } from '@prisma/client';

// Get my profile

export const getMyProfile: RequestHandler = async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  logger.info({ msg: 'Fetching user profile', userId: user?.id });
  if (!user || !user.id) {
    logger.error({ msg: 'Missing user id in request', user });
    return res.status(401).json({
      success: false,
      data: null,
      error: 'Unauthorized: user id missing',
    });
  }
  try {
    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      logger.warn({ msg: 'User not found', userId: user.id });
      return res.status(404).json({
        success: false,
        data: null,
        error: 'User not found',
      });
    }

    logger.info({ msg: 'Successfully fetched user profile', userId: user.id, rolesCount: dbUser.roles.length });
    return res.status(200).json({
      success: true,
      data: dbUser,
      error: null,
    });
  } catch (error) {
    logger.error({
      msg: 'Error fetching user profile',
      userId: user.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};


export const updateMyProfile: RequestHandler = async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  logger.info({ msg: 'Updating user profile', userId: user?.id });
  if (!user || !user.id) {
    logger.error({ msg: 'Missing user id in request', user });
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
        logger.warn({ msg: 'Invalid roles format', userId: user.id, providedRoles: roles });
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Roles must be a non-empty array',
        });
      }

      const validRoles = Object.values(Role);
      const invalidRoles = roles.filter((role: string) => !validRoles.includes(role as Role));

      if (invalidRoles.length > 0) {
        logger.warn({
          msg: 'Invalid roles provided',
          userId: user.id,
          invalidRoles: invalidRoles,
        });
        return res.status(400).json({
          success: false,
          data: null,
          error: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`,
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        mobileNumber,
        roles: roles ? { set: roles as Role[] } : undefined,
      },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info({ msg: 'Successfully updated user profile', userId: user.id, rolesCount: updatedUser.roles.length });
    return res.status(200).json({
      success: true,
      data: updatedUser,
      error: null,
    });
  } catch (error) {
    logger.error({
      msg: 'Error updating user profile',
      userId: user.id,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};
