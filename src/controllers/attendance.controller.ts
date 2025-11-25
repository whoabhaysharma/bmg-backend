import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware';
import { attendanceService } from '../services';
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
    const attendance = await attendanceService.getUserAttendance(
      req.user.id,
      gymId ? String(gymId) : undefined
    );

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
    logger.error('Error fetching attendance history', { userId: req.user.id, error });
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
    // Create attendance record
    const attendance = await attendanceService.checkIn(req.user.id, gymId);

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
  logger.info('Processing gym check-out', { userId: req.user.id, attendanceId });

  try {
    // Update attendance record with check out time
    const updatedAttendance = await attendanceService.checkOut(req.user.id, attendanceId);

    logger.info('Successfully checked out', {
      userId: req.user.id,
      attendanceId,
      duration: Math.round((updatedAttendance.checkOut!.getTime() - updatedAttendance.checkIn!.getTime()) / 1000 / 60), // Duration in minutes
    });

    return res.status(200).json({
      success: true,
      data: updatedAttendance,
      error: null,
    });
  } catch (error) {
    logger.error('Error checking out', { userId: req.user.id, attendanceId, error });
    next(error);
  }
};
