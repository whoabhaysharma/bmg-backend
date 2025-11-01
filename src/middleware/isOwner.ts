import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './isAuthenticated';

export const isOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!req.user.roles.includes('OWNER')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Owner access required'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};