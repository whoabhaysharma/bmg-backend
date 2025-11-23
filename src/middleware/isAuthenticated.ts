import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import NodeCache from 'node-cache';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';
import { userService } from '../services/user.service';

// We update the interface to use the full Prisma User type.
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Initialize NodeCache
// stdTTL is the default time-to-live in seconds for every generated cache element.
const CACHE_TTL = 900; // 15 minutes
const cache = new NodeCache({ stdTTL: CACHE_TTL });

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided or invalid token format',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // 1. Verify the token signature
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        roles: string[];
        email: string;
      };

      const cacheKey = `user:${decoded.userId}`;
      let user: User | undefined | null = null;

      // 2. Try to fetch from NodeCache (Synchronous)
      try {
        user = cache.get<User>(cacheKey);
        
        // Note: node-cache stores the object reference in memory.
        // We do NOT need to manually deserialize dates like we did with Redis strings.
      } catch (cacheError) {
        // It is very rare for node-cache to throw, but good to keep safety
        logger.warn('NodeCache error in isAuthenticated:', { error: cacheError });
      }

      // 3. If not in cache, fetch from DB
      if (!user) {
        user = await userService.getUserById(decoded.userId);

        if (user) {
          // Cache the user object
          try {
            // We store the object directly. No JSON.stringify needed.
            cache.set(cacheKey, user); 
          } catch (cacheError) {
            logger.warn('Failed to cache user in NodeCache:', { error: cacheError });
          }
        }
      }

      if (!user) {
        logger.warn(`Authentication failed: User ${decoded.userId} not found or soft-deleted`);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found or access revoked',
        });
      }

      // 4. Attach the full database user object to the request
      authReq.user = user;

      return next();
    } catch (error) {
      logger.error('Error verifying token:', { error });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Error in isAuthenticated middleware:', { error });
    return next(error);
  }
};