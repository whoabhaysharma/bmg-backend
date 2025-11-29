import { PrismaClient, NotificationType } from '@prisma/client';
import { notificationService } from './notification.service';

const prisma = new PrismaClient();

export const attendanceService = {
  async getAllAttendanceLogs() {
    return prisma.attendance.findMany({
      include: {
        user: true,
        gym: true,
      },
    });
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

    // --- Notification: Check In ---
    try {
      await notificationService.createNotification(
        userId,
        'Checked In',
        `You have successfully checked in at "${attendance.gym.name}".`,
        NotificationType.SUCCESS
      );
    } catch (error) {
      console.error('Failed to send check-in notification:', error);
    }

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

    // --- Notification: Check Out ---
    try {
      await notificationService.createNotification(
        userId,
        'Checked Out',
        `You have successfully checked out from "${updatedAttendance.gym.name}".`,
        NotificationType.INFO
      );
    } catch (error) {
      console.error('Failed to send check-out notification:', error);
    }

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
      },
    });

    // --- Notification: Check In ---
    try {
      await notificationService.createNotification(
        subscription.userId,
        'Checked In',
        `You have successfully checked in at "${attendance.gym.name}".`,
        NotificationType.SUCCESS
      );
    } catch (error) {
      console.error('Failed to send check-in notification:', error);
    }

    return attendance;
  },
};