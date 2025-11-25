import { PrismaClient } from '@prisma/client';

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

    return prisma.attendance.create({
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

    return prisma.attendance.update({
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
};