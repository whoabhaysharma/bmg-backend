import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
    email: string;
  };
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  try {
    logger.info('Authenticating request');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided or invalid token format',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        roles: string[];
        email: string;
      };

      authReq.user = {
        id: decoded.userId,
        roles: decoded.roles,
        email: decoded.email,
      };

      logger.info('User authenticated', { user: authReq.user });
      logger.info('Decoded token:', { decoded });

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
