import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './isAuthenticated';
import logger from '../lib/logger';

const prisma = new PrismaClient();

export const apiAuth = async (req: Request, res: Response, next: NextFunction) => {
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

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

        // Attach user with role from API Key
        (req as AuthenticatedRequest).user = {
            id: 'API_USER', // Or validKey.id
            name: validKey.name || 'API User',
            email: 'api@system.local',
            roles: [validKey.role], // Use the role from the database
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
