import { RequestHandler } from 'express';
import { AuthenticatedRequest } from './isAuthenticated';
import logger from '../lib/logger';

export const isOwner: RequestHandler = async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    logger.info('Checking owner access for user:', { user: authReq.user });
    if (!authReq.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!authReq.user.roles || !authReq.user.roles.includes('OWNER')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Owner access required',
      });
    }

    next();
  } catch (error) {
    logger.error('Error in isOwner middleware:', { error });
    next(error);
  }
};
