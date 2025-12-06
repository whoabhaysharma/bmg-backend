import { Request, Response, NextFunction } from 'express';

import { AuthenticatedRequest } from './isAuthenticated';


import { config } from '../config/config';

export const apiAuth = async (req: Request, res: Response, next: NextFunction) => {
    const internalSecret = req.headers['x-internal-secret'];

    // 1. Check for Internal Shared Secret (Fastest, No DB)
    if (internalSecret && internalSecret === config.internalSecret) {
        // Grant internal access
        (req as AuthenticatedRequest).user = {
            id: 'INTERNAL_SERVICE',
            name: 'Internal Service',
            email: 'internal@system.local',
            roles: ['ADMIN'], // Internal services are trusted as Admin
            createdAt: new Date(),
            updatedAt: new Date(),
            mobileNumber: null,
            deletedAt: null
        } as any;
        console.log('API Auth: Internal Access Granted');
        return next();
    }

    // 2. If an internal secret WAS provided but failed the check:
    if (internalSecret) {
        return res.status(401).json({ message: 'Invalid Internal Secret' });
    }

    // 3. If no secrets provided, continue to other auth methods (e.g. JWT)
    return next();
};
