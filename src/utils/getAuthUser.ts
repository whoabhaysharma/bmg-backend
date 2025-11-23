import { Request } from 'express';
import { AuthenticatedRequest } from '../middleware';

/**
 * Helper to safely extract the authenticated user from a request.
 */
export function getAuthUser(req: Request) {
  const authReq = req as AuthenticatedRequest;
  return authReq.user;
}
