import { User, Prisma, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { notificationService } from './notification.service';
import { NotificationType } from '@prisma/client';

export const userService = {
  // Create user
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const user = await prisma.user.create({ data });

    // --- Notification: Welcome ---
    try {
      await notificationService.createNotification(
        user.id,
        'Welcome to Gym Manager!',
        `Hello ${user.name}, your account has been successfully created.`,
        NotificationType.SUCCESS
      );
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }

    return user;
  },

  // Get user by id (ignores soft-deleted)
  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  // Get user by mobile
  async getUserByMobile(mobileNumber: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { mobileNumber, deletedAt: null },
    });
  },

  // Get users paginated
  async getAllUsers(page = 1, limit = 10, includeDeleted = false) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = includeDeleted
      ? {}
      : { deletedAt: null };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Update user
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    // --- Notification: Profile Updated ---
    try {
      await notificationService.createNotification(
        id,
        'Profile Updated',
        'Your profile details have been updated successfully.',
        NotificationType.INFO
      );
    } catch (error) {
      console.error('Failed to send profile update notification:', error);
    }

    return updatedUser;
  },

  // Soft delete
  async deleteUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  // Restore soft-deleted
  async restoreUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });
  },

  // Add role
  async addRole(userId: string, role: Role): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    if (user.roles.includes(role)) return user;

    return prisma.user.update({
      where: { id: userId },
      data: {
        roles: { push: role },
      },
    });
  },

  // Remove role
  async removeRole(userId: string, role: Role): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    if (!user.roles.includes(role)) throw new Error('Role not assigned to user');

    return prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: user.roles.filter((r) => r !== role),
        },
      },
    });
  },

  // User profile with relations
  async getUserProfileWithRelations(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        gymsOwned: true,
        subscriptions: {
          where: {
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
          include: {
            plan: true,
            gym: { select: { name: true } },
          },
        },
      },
    });
  },

  // Users filtered by role
  async getUsersByRole(role: Role, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: {
          roles: { has: role },
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({
        where: {
          roles: { has: role },
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
