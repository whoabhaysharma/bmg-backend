import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

// Get all gyms
export const getAllGyms = async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Fetching all gyms');
  try {
    // TODO: Implement logic to fetch all gyms
    res.json({ message: 'Not implemented' });
  } catch (error) {
    logger.error('Error fetching all gyms', error);
    next(error);
  }
};

// Get a single gym
export const getGym = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  logger.info(`Fetching gym with id: ${id}`);
  try {
    // TODO: Implement logic to fetch a single gym
    res.json({ message: 'Not implemented' });
  } catch (error) {
    logger.error(`Error fetching gym with id: ${id}`, error);
    next(error);
  }
};

// Get gym's subscription plans
export const getGymPlans = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  logger.info(`Fetching subscription plans for gym with id: ${id}`);
  try {
    // TODO: Implement logic to fetch gym's subscription plans
    res.json({ message: 'Not implemented' });
  } catch (error) {
    logger.error(`Error fetching subscription plans for gym with id: ${id}`, error);
    next(error);
  }
};
