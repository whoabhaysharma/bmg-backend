import { PrismaClient, ApiKey } from '@prisma/client';
import logger from '../lib/logger';

const prisma = new PrismaClient();

export const createApiKey = async (name: string, key: string): Promise<ApiKey> => {
    try {
        const apiKey = await prisma.apiKey.create({
            data: {
                name,
                key,
                isActive: true,
            },
        });
        return apiKey;
    } catch (error) {
        logger.error('Error creating API key:', error);
        throw error;
    }
};

export const getAllApiKeys = async (): Promise<ApiKey[]> => {
    try {
        return await prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        logger.error('Error fetching API keys:', error);
        throw error;
    }
};

export const deleteApiKey = async (id: string): Promise<void> => {
    try {
        await prisma.apiKey.delete({
            where: { id },
        });
    } catch (error) {
        logger.error(`Error deleting API key ${id}:`, error);
        throw error;
    }
};

export const toggleApiKeyStatus = async (id: string, isActive: boolean): Promise<ApiKey> => {
    try {
        return await prisma.apiKey.update({
            where: { id },
            data: { isActive },
        });
    } catch (error) {
        logger.error(`Error updating API key status ${id}:`, error);
        throw error;
    }
};
