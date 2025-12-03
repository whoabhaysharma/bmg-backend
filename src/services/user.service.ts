import { User, Prisma, Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { notificationService } from './notification.service';
import { invalidateUserCache } from '../middleware/isAuthenticated';
import { NotificationEvent } from '../types/notification-events';

export const userService = {
  // Create user
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    const user = await prisma.user.create({ data });

    // ✅ Event-based notification
    await notificationService.notifyUser(
      user.id,
      NotificationEvent.USER_CREATED,
      { userName: user.name }
    );

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

  // Get users paginated with filters
  async getAllUsers(filters: {
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    search?: string;
    role?: Role;
  } = {}) {
    const { page = 1, limit = 10, includeDeleted = false, search, role } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = includeDeleted
      ? {}
      : { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
      ];
    }

    if (role) {
      where.roles = { has: role };
    }

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

    // Invalidate cache to ensure fresh data on next auth
    invalidateUserCache(id);

    // ✅ Event-based notification
    await notificationService.notifyUser(
      id,
      NotificationEvent.USER_UPDATED,
      { userName: updatedUser.name }
    );

    return updatedUser;
  },

  // Soft delete
  async deleteUser(id: string): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) throw new Error('User not found');

    const deletedUser = await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Invalidate cache to ensure user cannot authenticate
    invalidateUserCache(id);

    // ✅ Event-based notification
    await notificationService.notifyUser(
      id,
      NotificationEvent.USER_DELETED,
      { userName: user.name }
    );

    return deletedUser;
  },

  // Restore soft-deleted
  async restoreUser(id: string): Promise<User> {
    const restoredUser = await prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Invalidate cache to allow user to authenticate again
    invalidateUserCache(id);

    // ✅ Event-based notification
    await notificationService.notifyUser(
      id,
      NotificationEvent.USER_RESTORED,
      { userName: restoredUser.name }
    );

    return restoredUser;
  },

  // Add role
  async addRole(userId: string, role: Role): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    if (user.roles.includes(role)) return user;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roles: { push: role },
      },
    });

    // Invalidate cache to ensure new role is reflected immediately
    invalidateUserCache(userId);

    // ✅ Event-based notification
    await notificationService.notifyUser(
      userId,
      NotificationEvent.USER_ROLE_ADDED,
      { userName: user.name, role }
    );

    return updatedUser;
  },

  // Remove role
  async removeRole(userId: string, role: Role): Promise<User> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    if (!user.roles.includes(role)) throw new Error('Role not assigned to user');

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          set: user.roles.filter((r) => r !== role),
        },
      },
    });

    // Invalidate cache to ensure role removal is reflected immediately
    invalidateUserCache(userId);

    // ✅ Event-based notification
    await notificationService.notifyUser(
      userId,
      NotificationEvent.USER_ROLE_REMOVED,
      { userName: user.name, role }
    );

    return updatedUser;
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

