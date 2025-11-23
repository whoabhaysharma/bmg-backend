import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const UserService = {
  async getAllUsers() {
    return prisma.user.findMany({
      include: {
        userRoles: true,
        gymsOwned: true,
        subscriptions: true,
      },
    });
  },

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: true,
        gymsOwned: true,
        subscriptions: true,
      },
    });
  },

  async createUser(data: { name: string; email: string; password?: string; mobileNumber?: string; googleId?: string }) {
    return prisma.user.create({
      data,
    });
  },

  async updateUser(id: string, data: Partial<{ name: string; email: string; password: string; mobileNumber: string }>) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async deleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  },
};