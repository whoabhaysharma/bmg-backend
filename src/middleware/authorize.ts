import { RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from './isAuthenticated';
import logger from '../lib/logger';

/**
 * Middleware factory to check if the user has one of the required roles.
 * @param allowedRoles Array of roles allowed to access the route
 */
export const authorize = (allowedRoles: Role[]): RequestHandler => {
    return (req, res, next) => {
        const authReq = req as AuthenticatedRequest;

        try {
            if (!authReq.user) {
                logger.warn('Authorization failed: User not authenticated');
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required',
                });
            }

            const userRoles = authReq.user.roles;
            const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

            if (!hasPermission) {
                logger.warn(
                    `Access denied: User ${authReq.user.id} with roles [${userRoles.join(
                        ', '
                    )}] attempted to access a route requiring [${allowedRoles.join(', ')}]`
                );
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'Insufficient permissions',
                });
            }

            next();
        } catch (error) {
            logger.error('Error in authorize middleware:', { error });
            next(error);
        }
    };
};
