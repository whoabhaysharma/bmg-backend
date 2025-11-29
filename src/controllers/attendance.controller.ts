import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware';
import { attendanceService } from '../services';
import logger from '../lib/logger';

// Get my attendance history
export const getMyAttendance = async (
  req: AuthenticatedRequest,
  res: Response
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
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Failed to fetch attendance history',
    });
  }
};

// Check in to a gym
export const checkIn = async (
  req: AuthenticatedRequest,
  res: Response
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
  } catch (error: any) {
    logger.error('Error checking in', { userId: req.user.id, gymId, error });

    // Handle specific error cases
    const errorMessage = error?.message || 'Failed to check in';

    if (errorMessage.includes('does not have an active subscription')) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'You do not have an active subscription for this gym',
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Failed to check in',
    });
  }
};

// Check out from a gym
export const checkOut = async (
  req: AuthenticatedRequest,
  res: Response
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
  } catch (error: any) {
    logger.error('Error checking out', { userId: req.user.id, attendanceId, error });

    // Handle specific error cases
    const errorMessage = error?.message || 'Failed to check out';

    if (errorMessage.includes('Active attendance record not found')) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Active attendance record not found or you are not authorized',
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      data: null,
      error: 'Failed to check out',
    });
  }
};

// Verify Check-in (Owner/Admin)
export const verifyCheckIn = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const { gymId } = req.params;
  const { accessCode } = req.body;

  if (!accessCode) {
    return res.status(400).json({
      success: false,
      error: 'Access code is required',
    });
  }

  logger.info('Verifying check-in', { userId: req.user.id, gymId, accessCode });

  try {
    const attendance = await attendanceService.verifyAndCheckIn(accessCode, gymId);

    logger.info('Successfully verified and checked in', {
      userId: attendance.userId,
      gymId,
      attendanceId: attendance.id,
    });

    return res.status(201).json({
      success: true,
      data: attendance,
      error: null,
    });
  } catch (error: any) {
    logger.error('Error verifying check-in', { userId: req.user.id, gymId, error });

    const errorMessage = error?.message || 'Failed to verify check-in';

    if (errorMessage === 'Invalid access code') {
      return res.status(404).json({
        success: false,
        error: 'Invalid access code',
      });
    }

    if (errorMessage === 'This access code is not for this gym') {
      return res.status(403).json({
        success: false,
        error: 'This access code is not valid for this gym',
      });
    }

    if (errorMessage === 'Subscription is not active' || errorMessage === 'Subscription has expired') {
      return res.status(403).json({
        success: false,
        error: errorMessage,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to verify check-in',
    });
  }
};
