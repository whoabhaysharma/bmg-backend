import { PrismaClient } from '@prisma/client';
import { notificationService } from './notification.service';
import { NotificationEvent } from '../types/notification-events';

const prisma = new PrismaClient();

// Helper function to calculate duration
function calculateDuration(checkIn: Date, checkOut: Date): string {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export const attendanceService = {
  async getAllAttendanceLogs(filters: {
    gymId?: string | string[];
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const { gymId, userId, startDate, endDate, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (gymId) {
      if (Array.isArray(gymId)) {
        where.gymId = { in: gymId };
      } else {
        where.gymId = gymId;
      }
    }

    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) where.checkIn.gte = startDate;
      if (endDate) where.checkIn.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: { select: { name: true, mobileNumber: true } },
          gym: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy: { checkIn: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getAttendanceById(id: string) {
    return prisma.attendance.findUnique({
      where: { id },
      include: {
        user: true,
        gym: true,
      },
    });
  },

  async getUserAttendance(userId: string, gymId?: string) {
    const where = {
      userId,
      ...(gymId ? { gymId } : {}),
    };

    return prisma.attendance.findMany({
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
  },

  async checkIn(userId: string, gymId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        gymId,
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (!subscription) {
      throw new Error('User does not have an active subscription for this gym');
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        gymId,
        subscriptionId: subscription.id,
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

    // ✅ Event-based notification
    await notificationService.notifyUser(
      userId,
      NotificationEvent.CHECKIN_SUCCESS,
      {
        gymName: attendance.gym.name,
        time: attendance.checkIn
      }
    );

    return attendance;
  },

  async checkOut(userId: string, attendanceId: string) {
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        userId,
        checkOut: null,
      },
    });

    if (!attendance) {
      throw new Error('Active attendance record not found');
    }

    const checkOutTime = new Date();
    const updatedAttendance = await prisma.attendance.update({
      where: {
        id: attendanceId,
      },
      data: {
        checkOut: checkOutTime,
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

    // ✅ Event-based notification with duration
    await notificationService.notifyUser(
      userId,
      NotificationEvent.CHECKOUT_SUCCESS,
      {
        gymName: updatedAttendance.gym.name,
        duration: calculateDuration(attendance.checkIn, checkOutTime)
      }
    );

    return updatedAttendance;
  },

  async updateAttendance(id: string, data: Partial<{ checkIn: Date; checkOut: Date }>) {
    return prisma.attendance.update({
      where: { id },
      data,
    });
  },

  async deleteAttendance(id: string) {
    return prisma.attendance.delete({
      where: { id },
    });
  },

  async verifyAndCheckIn(accessCode: string, gymId: string) {
    // 1. Find subscription by access code
    const subscription = await prisma.subscription.findUnique({
      where: { accessCode },
      include: {
        user: true,
        gym: true,
      },
    });

    if (!subscription) {
      throw new Error('Invalid access code');
    }

    // 2. Verify gym
    if (subscription.gymId !== gymId) {
      throw new Error('This access code is not for this gym');
    }

    // 3. Verify status
    if (subscription.status !== 'ACTIVE') {
      throw new Error('Subscription is not active');
    }

    // 4. Verify expiration
    if (subscription.endDate < new Date()) {
      throw new Error('Subscription has expired');
    }

    // 5. Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: subscription.userId,
        gymId: subscription.gymId,
        subscriptionId: subscription.id,
        checkIn: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobileNumber: true,
          }
        },
        gym: {
          select: {
            id: true,
            name: true,
          },
        },
        subscription: {
          include: {
            plan: {
              select: {
                name: true,
              }
            }
          }
        }
      },
    });

    // ✅ Event-based notification
    await notificationService.notifyUser(
      subscription.userId,
      NotificationEvent.CHECKIN_SUCCESS,
      {
        gymName: attendance.gym.name,
        time: attendance.checkIn
      }
    );

    return attendance;
  },
};