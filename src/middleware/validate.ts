import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import logger from '../lib/logger';

// Interface allowing optional validation for each part of the request
export interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Standardized Validation Error Response
 */
const sendValidationError = (res: Response, error: ZodError) => {
  const details = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return res.status(400).json({
    error: 'Validation Error',
    message: 'The request data is invalid.',
    details,
  });
};

/**
 * Middleware factory to validate request Body, Query, and Params using Zod.
 * 
 * Features:
 * - Validates body, query, and params independently.
 * - Strips unknown keys (if schema is strict) or passes them through (if schema is passthrough).
 * - Returns a standardized 400 error response with detailed field issues.
 * - Async validation support.
 * 
 * Usage:
 * router.post('/users', validate({ body: createUserSchema }), controller.createUser);
 */
export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate Body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      // Validate Query Params
      if (schemas.query) {
        // Cast to any to satisfy Express types (ParsedQs)
        req.query = (await schemas.query.parseAsync(req.query)) as any;
      }

      // Validate Route Params
      if (schemas.params) {
        // Cast to any to satisfy Express types (ParamsDictionary)
        req.params = (await schemas.params.parseAsync(req.params)) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          issues: error.issues,
        });
        return sendValidationError(res, error);
      }

      logger.error('Unexpected error during validation:', { error });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during validation.',
      });
    }
  };
};