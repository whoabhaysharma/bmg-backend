import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import NodeCache from 'node-cache';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';
import { userService } from '../services';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const CACHE_TTL = 900;
const cache = new NodeCache({ stdTTL: CACHE_TTL });

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const authHeader = req.headers.authorization;

    // --- TEST EXPECTATION: Must return { message: "Unauthorized" } ---
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        roles: string[];
        email: string;
      };

      const cacheKey = `user:${decoded.userId}`;
      let user: User | undefined | null = null;

      try {
        user = cache.get<User>(cacheKey);
      } catch (cacheError) {
        logger.warn('NodeCache error in isAuthenticated:', { error: cacheError });
      }

      if (!user) {
        user = await userService.getUserById(decoded.userId);
        if (user) cache.set(cacheKey, user);
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
