import { User, Prisma, Role } from '@prisma/client';
import prisma from '../lib/prisma';

/**
 * Create a new user
 */
export const createUser = async (data: Prisma.UserCreateInput): Promise<User> => {
  return prisma.user.create({
    data,
  });
};

/**
 * Get a user by ID
 * Excludes soft-deleted users by default
 */
export const getUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findFirst({
    where: {
      id,
      deletedAt: null, // Soft delete check
    },
  });
};

/**
 * Get a user by Mobile Number
 */
export const getUserByMobile = async (mobileNumber: string): Promise<User | null> => {
  return prisma.user.findFirst({
    where: {
      mobileNumber,
      deletedAt: null,
    },
  });
};

/**
 * Get all users (Paginated)
 * Defaults to 10 users per page
 */
export const getAllUsers = async (page: number = 1, limit: number = 10, includeDeleted = false) => {
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
};

/**
 * Update user details
 */
export const updateUser = async (id: string, data: Prisma.UserUpdateInput): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

/**
 * Soft delete a user (Sets deletedAt to now)
 */
export const deleteUser = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
};

/**
 * Restore a soft-deleted user
 */
export const restoreUser = async (id: string): Promise<User> => {
  return prisma.user.update({
    where: { id },
    data: {
      deletedAt: null,
    },
  });
};

/**
 * Add a role to a user (e.g., upgrading User to Gym Owner)
 */
export const addRole = async (userId: string, role: Role): Promise<User> => {
  const user = await getUserById(userId);

  if (!user) throw new Error('User not found');
  if (user.roles.includes(role)) return user; // Role already exists

  return prisma.user.update({
    where: { id: userId },
    data: {
      roles: {
        push: role,
      },
    },
  });
};

/**
 * Remove a role from a user
 */
export const removeRole = async (userId: string, role: Role): Promise<User> => {
  const user = await getUserById(userId);

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
};

/**
 * Get User Profile with deep relations
 * Fetches owned gyms and active subscriptions
 */
export const getUserProfileWithRelations = async (userId: string) => {
  return prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null
    },
    include: {
      gymsOwned: true,
      subscriptions: {
        where: {
          status: 'ACTIVE', // Only fetch active subs
          endDate: {
            gte: new Date(), // Ensure not expired
          }
        },
        include: {
          plan: true,
          gym: {
            select: { name: true }
          }
        }
      }
    }
  });
};

/**
 * Get all users with role filtering
 */
export const getUsersByRole = async (role: Role, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: {
        roles: {
          has: role,
        },
        deletedAt: null,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({
      where: {
        roles: {
          has: role,
        },
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
};
