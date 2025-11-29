import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Get my attendance history
export const getMyAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const { gymId } = req.query;
  logger.info('Fetching attendance history', { userId: req.user.id, gymId });

  try {
    const where = {
      userId: req.user.id,
      ...(gymId ? { gymId: String(gymId) } : {}),
    };

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    logger.info('Successfully fetched attendance history', {
      userId: req.user.id,
      count: attendance.length,
    });

    return res.status(200).json({
      success: true,
      data: attendance,
      error: null,
    });
  } catch (error) {
    logger.error('Error fetching attendance history', {
      userId: req.user.id,
      error,
    });
    next(error);
  }
};

// Check in to a gym
export const checkIn = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const { gymId } = req.params;
  logger.info('Processing gym check-in', { userId: req.user.id, gymId });

  try {
    // Verify active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.id,
        gymId,
        status: 'ACTIVE',
      },
    });

    if (!activeSubscription) {
      logger.warn('No active subscription found', {
        userId: req.user.id,
        gymId,
      });
      return res.status(403).json({
        success: false,
        error: 'No active subscription found for this gym',
      });
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: req.user.id,
        gymId,
        checkIn: new Date(),
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Successfully checked in', {
      userId: req.user.id,
      gymId,
      attendanceId: attendance.id,
    });

    return res.status(201).json({
      success: true,
      data: attendance,
      error: null,
    });
  } catch (error) {
    logger.error('Error checking in', { userId: req.user.id, gymId, error });
    next(error);
  }
};

// Check out from a gym
export const checkOut = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const { attendanceId } = req.params;
  logger.info('Processing gym check-out', {
    userId: req.user.id,
    attendanceId,
  });

  try {
    // Find attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        userId: req.user.id,
        checkOut: null,
      },
    });

    if (!attendance) {
      logger.warn('Active attendance record not found', {
        userId: req.user.id,
        attendanceId,
      });
      return res.status(404).json({
        success: false,
        error: 'Active attendance record not found',
      });
    }

    // Update attendance record with check out time
    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: attendanceId,
      },
      data: {
        checkOut: new Date(),
      },
      include: {
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Successfully checked out', {
      userId: req.user.id,
      attendanceId,
      duration: Math.round(
        (updatedAttendance.checkOut!.getTime() -
          attendance.checkIn!.getTime()) /
          1000 /
          60
      ), // Duration in minutes
    });

    return res.status(200).json({
      success: true,
      data: updatedAttendance,
      error: null,
    });
  } catch (error) {
    logger.error('Error checking out', {
      userId: req.user.id,
      attendanceId,
      error,
    });
    next(error);
  }
};
