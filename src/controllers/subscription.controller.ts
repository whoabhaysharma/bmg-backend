import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';

// Get my subscriptions
export const getMySubscriptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};

// Subscribe to a plan
export const subscribe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};

// Cancel subscription
export const cancelSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};