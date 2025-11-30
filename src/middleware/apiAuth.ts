import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './isAuthenticated';
import logger from '../lib/logger';

const prisma = new PrismaClient();

export const apiAuth = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return next(); // Continue to other auth methods if no key
    }

    try {
        const validKey = await prisma.apiKey.findUnique({
            where: { key: apiKey, isActive: true }
        });

        if (!validKey) {
            return res.status(401).json({ message: 'Invalid API Key' });
        }

        // Attach a mock admin user for compatibility
        (req as AuthenticatedRequest).user = {
            id: 'API_ADMIN',
            name: validKey.name || 'API User',
            email: 'api@system.local',
            roles: ['ADMIN'],
            createdAt: new Date(),
            updatedAt: new Date(),
            mobileNumber: null,
            deletedAt: null
        } as any;

        logger.info(`API Access granted for key: ${validKey.name}`);
        return next();
    } catch (error) {
        logger.error('API Key validation error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
