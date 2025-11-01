import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';

// Get all gyms
export const getAllGyms = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};

// Get a single gym
export const getGym = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};

// Get gym's subscription plans
export const getGymPlans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
  } catch (error) {
    next(error);
  }
};