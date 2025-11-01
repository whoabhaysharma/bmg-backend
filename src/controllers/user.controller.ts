import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';

// Get my profile
export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};

// Update my profile
export const updateMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};
