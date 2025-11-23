import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Send a success response
 */
export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
  } as ApiResponse<T>);
}

/**
 * Send an error response
 */
export function sendError(res: Response, error: string, statusCode: number = 500, data: any = null) {
  return res.status(statusCode).json({
    success: false,
    data,
    error,
  } as ApiResponse);
}

/**
 * Send a 401 Unauthorized response
 */
export function sendUnauthorized(res: Response) {
  return sendError(res, 'User not authenticated', 401);
}

/**
 * Send a 403 Forbidden response
 */
export function sendForbidden(res: Response, message: string = 'Access denied') {
  return sendError(res, message, 403);
}

/**
 * Send a 404 Not Found response
 */
export function sendNotFound(res: Response, message: string = 'Resource not found') {
  return sendError(res, message, 404);
}

/**
 * Send a 400 Bad Request response
 */
export function sendBadRequest(res: Response, message: string = 'Bad request') {
  return sendError(res, message, 400);
}

/**
 * Send a 500 Internal Server Error response
 */
export function sendInternalError(res: Response, message: string = 'Internal server error') {
  return sendError(res, message, 500);
}
