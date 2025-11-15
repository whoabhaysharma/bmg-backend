import prisma from '../lib/prisma';
import logger from '../lib/logger';

/**
 * Service class for attendance/check-in operations
 * Handles gym check-in/check-out for USER role
 * OWNER can view attendance records for their gyms
 */
export class AttendanceService {
  /**
   * Get attendance history for a user
   * Optionally filter by gym
   * @param userId - User ID to fetch attendance for
   * @param gymId - Optional gym ID to filter by
   * @returns List of attendance records
   */
  async getUserAttendance(userId: string, gymId?: string) {
    logger.info('Fetching attendance history', { userId, gymId });

    const where = {
      userId,
      ...(gymId ? { gymId } : {}),
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
      userId,
      count: attendance.length,
    });

    return attendance;
  }

  /**
   * Get attendance records for a gym (OWNER use case)
   * Verifies gym ownership before returning data
   * @param gymId - Gym ID to fetch attendance for
   * @param ownerId - Owner ID requesting the data
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns List of attendance records for the gym
   */
  async getGymAttendance(
    gymId: string,
    ownerId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    logger.info('Fetching gym attendance', { gymId, ownerId });

    // Verify gym ownership
    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        ownerId,
      },
    });

    if (!gym) {
      logger.warn('Unauthorized access to gym attendance', {
        userId: ownerId,
        gymId,
      });
      throw new Error("Not authorized to view this gym's attendance records");
    }

    const where: any = { gymId };

    // Add date filters if provided
    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) {
        where.checkIn.gte = startDate;
      }
      if (endDate) {
        where.checkIn.lte = endDate;
      }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    logger.info('Successfully fetched gym attendance', {
      gymId,
      ownerId,
      count: attendance.length,
    });

    return attendance;
  }

  /**
   * Check in to a gym
   * Verifies active subscription before allowing check-in
   * @param userId - User ID checking in
   * @param gymId - Gym ID to check in to
   * @returns Created attendance record
   */
  async checkIn(userId: string, gymId: string) {
    logger.info('Processing gym check-in', { userId, gymId });

    // Verify active subscription
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        gymId,
        status: 'ACTIVE',
      },
    });

    if (!activeSubscription) {
      logger.warn('No active subscription found', { userId, gymId });
      throw new Error('No active subscription found for this gym');
    }

    // Check if user already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCheckIn = await prisma.attendance.findFirst({
      where: {
        userId,
        gymId,
        checkIn: {
          gte: today,
        },
      },
    });

    if (existingCheckIn) {
      logger.warn('User already checked in today', {
        userId,
        gymId,
        attendanceId: existingCheckIn.id,
      });
      throw new Error('You have already checked in today');
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId,
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
      userId,
      gymId,
      attendanceId: attendance.id,
    });

    return attendance;
  }

  /**
   * Check out from a gym
   * Updates attendance record with check-out time
   * @param userId - User ID checking out
   * @param attendanceId - Attendance ID to update
   * @returns Updated attendance record
   */
  async checkOut(userId: string, attendanceId: string) {
    logger.info('Processing gym check-out', { userId, attendanceId });

    // Find attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        userId,
        checkOut: null,
      },
    });

    if (!attendance) {
      logger.warn('Active attendance record not found', {
        userId,
        attendanceId,
      });
      throw new Error('Active attendance record not found');
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

    const duration = Math.round(
      (updatedAttendance.checkOut!.getTime() -
        attendance.checkIn!.getTime()) /
        1000 /
        60
    ); // Duration in minutes

    logger.info('Successfully checked out', {
      userId,
      attendanceId,
      duration,
    });

    return updatedAttendance;
  }

  /**
   * Get current active check-in for a user at a gym
   * Used to find which attendance record to check out
   * @param userId - User ID
   * @param gymId - Gym ID
   * @returns Active attendance record or null
   */
  async getActiveCheckIn(userId: string, gymId: string) {
    logger.info('Fetching active check-in', { userId, gymId });

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        gymId,
        checkOut: null,
      },
      orderBy: {
        checkIn: 'desc',
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

    if (attendance) {
      logger.info('Found active check-in', {
        userId,
        gymId,
        attendanceId: attendance.id,
      });
    } else {
      logger.info('No active check-in found', { userId, gymId });
    }

    return attendance;
  }

  /**
   * Get attendance statistics for a user
   * @param userId - User ID
   * @param gymId - Optional gym ID to filter by
   * @returns Attendance statistics
   */
  async getUserAttendanceStats(userId: string, gymId?: string) {
    logger.info('Fetching user attendance stats', { userId, gymId });

    const where: any = { userId };
    if (gymId) {
      where.gymId = gymId;
    }

    const total = await prisma.attendance.count({ where });

    const completed = await prisma.attendance.count({
      where: {
        ...where,
        checkOut: {
          not: null,
        },
      },
    });

    const active = await prisma.attendance.count({
      where: {
        ...where,
        checkOut: null,
      },
    });

    // Get attendance for current month
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const thisMonth = await prisma.attendance.count({
      where: {
        ...where,
        checkIn: {
          gte: currentMonthStart,
        },
      },
    });

    logger.info('Successfully fetched user attendance stats', { userId });

    return {
      total,
      completed,
      active,
      thisMonth,
    };
  }

  /**
   * Get attendance statistics for a gym (OWNER dashboard)
   * @param gymId - Gym ID
   * @param ownerId - Owner ID
   * @returns Gym attendance statistics
   */
  async getGymAttendanceStats(gymId: string, ownerId: string) {
    logger.info('Fetching gym attendance stats', { gymId, ownerId });

    // Verify gym ownership
    const gym = await prisma.gym.findFirst({
      where: {
        id: gymId,
        ownerId,
      },
    });

    if (!gym) {
      logger.warn('Unauthorized access to gym attendance stats', {
        userId: ownerId,
        gymId,
      });
      throw new Error("Not authorized to view this gym's attendance statistics");
    }

    const total = await prisma.attendance.count({
      where: { gymId },
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await prisma.attendance.count({
      where: {
        gymId,
        checkIn: {
          gte: today,
        },
      },
    });

    // Get currently checked in users
    const currentlyCheckedIn = await prisma.attendance.count({
      where: {
        gymId,
        checkOut: null,
      },
    });

    // Get this month's attendance
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const thisMonth = await prisma.attendance.count({
      where: {
        gymId,
        checkIn: {
          gte: currentMonthStart,
        },
      },
    });

    logger.info('Successfully fetched gym attendance stats', { gymId, ownerId });

    return {
      total,
      todayCount,
      currentlyCheckedIn,
      thisMonth,
    };
  }

  /**
   * Get attendance by ID
   * @param attendanceId - Attendance ID
   * @returns Attendance record or null
   */
  async getAttendanceById(attendanceId: string) {
    logger.info('Fetching attendance record', { attendanceId });

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!attendance) {
      logger.warn('Attendance record not found', { attendanceId });
      return null;
    }

    return attendance;
  }
}

export const attendanceService = new AttendanceService();
