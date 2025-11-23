import { RequestHandler } from 'express';
import { AuthenticatedRequest } from '../middleware';
import { GymService } from '../services/gym.service';
import logger from '../lib/logger';
import { getAuthUser } from '../utils/getAuthUser';
import { sendSuccess, sendUnauthorized, sendForbidden, sendNotFound, sendInternalError } from '../utils/response';

// Create a new gym
export const createGym: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, address } = req.body;

    if (!authReq.user?.id) {
      logger.error('User ID not found in request');
      return sendUnauthorized(res);
    }

    const ownerId = authReq.user.id;

    // Only OWNER role can create gym (enforced by isOwner middleware in routes)
    const gym = await GymService.createGym({
      name,
      address,
      ownerId,
    });

    logger.info(`Successfully created gym with id: ${gym.id}`);
    return sendSuccess(res, gym, 201);
  } catch (error) {
    logger.error(`Error creating gym: ${error}`);
    return sendInternalError(res);
  }
};

// Get all gyms
export const getAllGyms: RequestHandler = async (req, res) => {
  const user = getAuthUser(req);
  logger.info('Fetching all gyms', { userId: user?.id });
  try {
    const gyms = await GymService.getAllGyms();
    logger.info('Successfully fetched all gyms');
    return sendSuccess(res, gyms);
  } catch (error) {
    logger.error(`Error fetching all gyms: ${error}`);
    return sendInternalError(res);
  }
};

// Get my gyms (where user is owner)
export const getMyGyms: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user?.id) {
      logger.error('User ID not found in request');
      return sendUnauthorized(res);
    }

    const userId = authReq.user.id;
    logger.info(`Fetching gyms owned by user: ${userId}`);

    // For now, filter all gyms by owner. In future, we can add a dedicated service method
    const allGyms = await GymService.getAllGyms();
    const myGyms = allGyms.filter((gym) => gym.ownerId === userId);

    logger.info(`Successfully fetched ${myGyms.length} gyms for user: ${userId}`);
    return sendSuccess(res, myGyms);
  } catch (error) {
    logger.error(`Error fetching user's gyms: ${error}`);
    return sendInternalError(res);
  }
};

// Get a single gym by ID
export const getGymById: RequestHandler = async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching gym with id: ${id}`);
  try {
    const gym = await GymService.getGymById(id);

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return sendNotFound(res, 'Gym not found');
    }

    logger.info(`Successfully fetched gym with id: ${id}`);
    return sendSuccess(res, gym);
  } catch (error) {
    logger.error(`Error fetching gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};

// Update a gym
export const updateGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);

  if (!user?.id) {
    return sendUnauthorized(res);
  }

  logger.info(`Updating gym with id: ${id}`, { userId: user.id });
  try {
    const { name, address } = req.body;
    const ownerId = user.id;

    const gym = await GymService.getGymById(id);

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return sendNotFound(res, 'Gym not found');
    }

    if (gym.ownerId !== ownerId) {
      logger.warn(`User ${ownerId} is not authorized to update gym with id: ${id}`);
      return sendForbidden(res, 'You are not authorized to update this gym');
    }

    const updatedGym = await GymService.updateGym(id, { name, address });

    logger.info(`Successfully updated gym with id: ${id}`);
    return sendSuccess(res, updatedGym);
  } catch (error) {
    logger.error(`Error updating gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};

// Delete a gym
export const deleteGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);

  if (!user?.id) {
    return sendUnauthorized(res);
  }

  logger.info(`Deleting gym with id: ${id}`, { userId: user.id });
  try {
    const ownerId = user.id;
    const gym = await GymService.getGymById(id);

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return sendNotFound(res, 'Gym not found');
    }

    if (gym.ownerId !== ownerId) {
      logger.warn(`User ${ownerId} is not authorized to delete gym with id: ${id}`);
      return sendForbidden(res, 'You are not authorized to delete this gym');
    }

    await GymService.deleteGym(id);

    logger.info(`Successfully deleted gym with id: ${id}`);
    return sendSuccess(res, null, 204);
  } catch (error) {
    logger.error(`Error deleting gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};
