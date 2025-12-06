import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import NodeCache from 'node-cache';
import { config } from '../config/config';
import logger from '../lib/logger';
import { userService } from '@services';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

interface CachedUser {
  user: User;
  cachedAt: number; // Timestamp when cached
}

const CACHE_TTL = 900;
const cache = new NodeCache({ stdTTL: CACHE_TTL });

/**
 * Invalidate user cache when permissions/roles change
 * Call this function after updating user roles or permissions
 */
export const invalidateUserCache = (userId: string): void => {
  const cacheKey = `user:${userId}`;
  try {
    cache.del(cacheKey);
    logger.info(`Cache invalidated for user: ${userId}`);
  } catch (error) {
    logger.warn('Error invalidating user cache:', { userId, error });
  }
};

/**
 * Invalidate all user caches
 * Use sparingly - only when necessary (e.g., system-wide permission changes)
 */
export const invalidateAllUserCaches = (): void => {
  try {
    cache.flushAll();
    logger.info('All user caches invalidated');
  } catch (error) {
    logger.warn('Error invalidating all user caches:', { error });
  }
};

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;

  try {
    // If user is already authenticated (e.g. via API Key middleware), skip token check
    if (authReq.user) {
      return next();
    }

    const authHeader = req.headers.authorization;

    // --- TEST EXPECTATION: Must return { message: "Unauthorized" } ---
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        roles: string[];
        email: string;
      };

      const cacheKey = `user:${decoded.userId}`;
      let user: User | null = null;
      let cachedData: CachedUser | undefined;
      let needsRefresh = false;

      try {
        cachedData = cache.get<CachedUser>(cacheKey);
      } catch (cacheError) {
        logger.warn('NodeCache error in isAuthenticated:', { error: cacheError });
      }

      if (cachedData) {
        // Check if cached user data is stale by comparing updatedAt timestamp
        const cachedUser = cachedData.user;
        const cachedTime = new Date(cachedData.cachedAt);
        const userUpdatedAt = new Date(cachedUser.updatedAt);

        // If user was updated after being cached, we need fresh data
        if (userUpdatedAt > cachedTime) {
          needsRefresh = true;
          logger.info(`User ${decoded.userId} data is stale, refreshing cache`);
        } else {
          user = cachedUser;
        }
      }

      // Fetch from database if not cached or stale
      if (!cachedData || needsRefresh) {
        user = await userService.getUserById(decoded.userId);
        if (user) {
          const newCachedData: CachedUser = {
            user,
            cachedAt: Date.now()
          };
          cache.set(cacheKey, newCachedData);
        }
      }

      // --- TEST EXPECTATION: Must return { message: "Unauthorized" } ---
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      authReq.user = user;
      return next();

    } catch (error) {
      logger.error('Error verifying token:', { error });

      // --- TEST EXPECTATION: Must return { message: "Unauthorized" } ---
      return res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (error) {
    logger.error('Error in isAuthenticated middleware:', { error });
    return res.status(500).json({ message: 'Internal error' });
  }
};
