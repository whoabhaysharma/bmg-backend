import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const RoleService = {
  async getAllRoles() {
    return prisma.userRole.findMany({
      include: {
        user: true,
      },
    });
  },

  async getRoleById(id: string) {
    return prisma.userRole.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  },

  async createRole(data: { userId: string; role: string }) {
    return prisma.userRole.create({
      data,
    });
  },

  async deleteRole(id: string) {
    return prisma.userRole.delete({
      where: { id },
    });
  },
};