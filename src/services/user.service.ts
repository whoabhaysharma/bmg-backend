import { User, Prisma, Role } from '@prisma/client';
import prisma from '../lib/prisma';

export class UserService {
  
  /**
   * Create a new user
   */
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Get a user by ID
   * Excludes soft-deleted users by default
   */
  async getUserById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null, // Soft delete check
      },
    });
  }

  /**
   * Get a user by Mobile Number
   */
  async getUserByMobile(mobileNumber: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        mobileNumber,
        deletedAt: null,
      },
    });
  }

  /**
   * Get all users (Paginated)
   * Defaults to 10 users per page
   */
  async getAllUsers(page: number = 1, limit: number = 10, includeDeleted = false) {
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
  }

  /**
   * Update user details
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a user (Sets deletedAt to now)
   */
  async deleteUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Restore a soft-deleted user
   */
  async restoreUser(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  /**
   * Add a role to a user (e.g., upgrading User to Gym Owner)
   */
  async addRole(userId: string, role: Role): Promise<User> {
    const user = await this.getUserById(userId);
    
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
  }

  /**
   * Get User Profile with deep relations
   * Fetches owned gyms and active subscriptions
   */
  async getUserProfileWithRelations(userId: string) {
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
  }

  /**
   * Get all users with role filtering
   */
  async getUsersByRole(role: Role, page: number = 1, limit: number = 10) {
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
  }
}

export const userService = new UserService();