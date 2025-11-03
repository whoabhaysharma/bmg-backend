import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../lib/logger';

// Generic validation middleware creator
export const validate = <T>(schema: z.ZodType<T>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Validating request body');
      // Validate the request body against the provided schema
      const validatedData = await schema.parseAsync(req.body);

      // Attach the validated data to the request
      req.body = validatedData;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Validation error:', { error });
        return res.status(400).json({
          error: 'Validation Error',
          details: error.issues.map((issue: z.ZodIssue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      } else {
        logger.error('Internal server error in validation:', { error });
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'An unexpected error occurred.',
        });
      }
    }
  };
};
