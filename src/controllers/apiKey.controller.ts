import { RequestHandler } from 'express';
import { apiKeyService } from '../services';
import { sendSuccess, sendInternalError } from '../utils/response';
import logger from '../lib/logger';

export const createApiKey: RequestHandler = async (req, res) => {
    try {
        const { name, key } = req.body;
        const apiKey = await apiKeyService.createApiKey(name, key);
        logger.info(`Created API Key: ${name}`);
        return sendSuccess(res, apiKey, 201);
    } catch (error) {
        logger.error('Error creating API key:', error);
        return sendInternalError(res);
    }
};

export const getAllApiKeys: RequestHandler = async (_req, res) => {
    try {
        const apiKeys = await apiKeyService.getAllApiKeys();
        return sendSuccess(res, apiKeys);
    } catch (error) {
        logger.error('Error fetching API keys:', error);
        return sendInternalError(res);
    }
};

export const deleteApiKey: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        await apiKeyService.deleteApiKey(id);
        logger.info(`Deleted API Key: ${id}`);
        return sendSuccess(res, null, 204);
    } catch (error) {
        logger.error('Error deleting API key:', error);
        return sendInternalError(res);
    }
};

export const toggleApiKeyStatus: RequestHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const apiKey = await apiKeyService.toggleApiKeyStatus(id, isActive);
        logger.info(`Updated API Key status: ${id} -> ${isActive}`);
        return sendSuccess(res, apiKey);
    } catch (error) {
        logger.error('Error updating API key status:', error);
        return sendInternalError(res);
    }
};
