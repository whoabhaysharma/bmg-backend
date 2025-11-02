import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';

// Get my profile
export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Update my profile (with optional roles)
export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, mobileNumber, roles } = req.body;

    // Validate roles if provided
    if (roles) {
      if (!Array.isArray(roles) || roles.length === 0) {
        return res.status(400).json({
          message: 'Roles must be a non-empty array',
        });
      }

      const validRoles = ['OWNER', 'USER'];
      const invalidRoles = roles.filter((role) => !validRoles.includes(role));

      if (invalidRoles.length > 0) {
        return res.status(400).json({
          message: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`,
        });
      }

      // Remove all existing roles and create new ones
      await prisma.userRole.deleteMany({
        where: {
          userId: req.user.id,
        },
      });

      await prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: req.user.id,
          role,
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

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};