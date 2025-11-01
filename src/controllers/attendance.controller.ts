import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';

// Get my attendance history
export const getMyAttendance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};