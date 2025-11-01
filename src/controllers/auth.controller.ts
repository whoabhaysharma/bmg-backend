import { Request, Response, NextFunction } from 'express';

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Implementation will be added later
  } catch (error) {
    next(error);
  }
};
