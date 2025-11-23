import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const AttendanceService = {
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

  async createAttendance(data: { userId: string; gymId: string; date: Date; checkIn?: Date; checkOut?: Date }) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: data.userId,
        gymId: data.gymId,
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (!subscription) {
      throw new Error('User does not have an active subscription for this gym');
    }

    const { date, ...rest } = data;
    return prisma.attendance.create({
      data: {
        ...rest,
        subscriptionId: subscription.id,
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