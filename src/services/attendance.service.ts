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
    return prisma.attendance.create({
      data,
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