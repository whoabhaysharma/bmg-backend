import { RequestHandler } from 'express';
import { AuthenticatedRequest } from '../middleware';
import logger from '../lib/logger';
import { getAuthUser } from '../utils/getAuthUser';
import { gymService } from '../services'
import { sendSuccess, sendUnauthorized, sendForbidden, sendNotFound, sendInternalError } from '../utils/response';
import { Role } from '@prisma/client';

// --------------------------------------------------------------------------
// createGym
// --------------------------------------------------------------------------
export const createGym: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, address, ownerId: explicitOwnerId } = req.body;
    const user = authReq.user;

    if (!user?.id) {
      logger.error('User ID not found in request');
      return sendUnauthorized(res);
    }

    // 🎯 Use Role.ADMIN
    const isAdmin = user.roles?.includes(Role.ADMIN);

    let finalOwnerId = user.id;

    if (isAdmin && explicitOwnerId) {
      finalOwnerId = explicitOwnerId;
    }

    const gym = await gymService.createGym({
      name,
      address,
      ownerId: finalOwnerId,
    });

    logger.info(`Successfully created gym with id: ${gym.id}`);
    return sendSuccess(res, gym, 201);
  } catch (error) {
    logger.error(`Error creating gym: ${error}`);
    return sendInternalError(res);
  }
};

// Get all gyms (No changes needed here)
export const getAllGyms: RequestHandler = async (req, res) => {
  const user = getAuthUser(req);
  logger.info('Fetching all gyms', { userId: user?.id });
  try {
    const gyms = await gymService.getAllGyms();
    logger.info('Successfully fetched all gyms');
    return sendSuccess(res, gyms);
  } catch (error) {
    logger.error(`Error fetching all gyms: ${error}`);
    return sendInternalError(res);
  }
};

// Get my gyms (No changes needed here)
export const getMyGyms: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user?.id) {
      logger.error('User ID not found in request');
      return sendUnauthorized(res);
    }

    const userId = authReq.user.id;
    logger.info(`Fetching gyms owned by user: ${userId}`);

    const allGyms = await gymService.getAllGyms();
    const myGyms = allGyms.filter((gym) => gym.ownerId === userId);

    logger.info(`Successfully fetched ${myGyms.length} gyms for user: ${userId}`);
    return sendSuccess(res, myGyms);
  } catch (error) {
    logger.error(`Error fetching user's gyms: ${error}`);
    return sendInternalError(res);
  }
};

// Get a single gym by ID (No changes needed here)
export const getGymById: RequestHandler = async (req, res) => {
  const { id } = req.params;
  logger.info(`Fetching gym with id: ${id}`);
  try {
    const gym = await gymService.getGymById(id);

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

// --------------------------------------------------------------------------
// updateGym
// --------------------------------------------------------------------------
export const updateGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);

  if (!user?.id) {
    return sendUnauthorized(res);
  }

  logger.info(`Updating gym with id: ${id}`, { userId: user.id });
  try {
    const { name, address } = req.body;
    const userId = user.id;

    // 🎯 Use Role.ADMIN
    const isAdmin = user.roles?.includes(Role.ADMIN);

    const gym = await gymService.getGymById(id);

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return sendNotFound(res, 'Gym not found');
    }

    // Authorization Check: Must be the owner OR an Admin
    if (gym.ownerId !== userId && !isAdmin) {
      logger.warn(`User ${userId} is not authorized to update gym with id: ${id}`);
      return sendForbidden(res, 'You are not authorized to update this gym');
    }

    const updatedGym = await gymService.updateGym(id, { name, address });

    logger.info(`Successfully updated gym with id: ${id}`);
    return sendSuccess(res, updatedGym);
  } catch (error) {
    logger.error(`Error updating gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};

// --------------------------------------------------------------------------
// deleteGym
// --------------------------------------------------------------------------
export const deleteGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);

  if (!user?.id) {
    return sendUnauthorized(res);
  }

  logger.info(`Deleting gym with id: ${id}`, { userId: user.id });
  try {
    const ownerId = user.id;
    // 🎯 Use Role.ADMIN
    const isAdmin = user.roles?.includes(Role.ADMIN);

    const gym = await gymService.getGymById(id);

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return sendNotFound(res, 'Gym not found');
    }

    // Authorization Check: Must be the owner OR an Admin
    if (gym.ownerId !== ownerId && !isAdmin) {
      logger.warn(`User ${ownerId} is not authorized to delete gym with id: ${id}`);
      return sendForbidden(res, 'You are not authorized to delete this gym');
    }

    await gymService.deleteGym(id);

    logger.info(`Successfully deleted gym with id: ${id}`);
    return sendSuccess(res, null, 204);
  } catch (error) {
    logger.error(`Error deleting gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};

// --------------------------------------------------------------------------
// verifyGym
// --------------------------------------------------------------------------
export const verifyGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);

  // 🎯 Use Role.ADMIN
  if (!user?.roles?.includes(Role.ADMIN)) {
    return sendForbidden(res, 'Only admin can verify gyms');
  }

  try {
    const gym = await gymService.getGymById(id);
    if (!gym) {
      return sendNotFound(res, 'Gym not found');
    }
    const updatedGym = await gymService.setGymVerified(id, true);
    return sendSuccess(res, updatedGym);
  } catch (error) {
    logger.error(`Error verifying gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};

// --------------------------------------------------------------------------
// unverifyGym
// --------------------------------------------------------------------------
export const unverifyGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);

  // 🎯 Use Role.ADMIN
  if (!user?.roles?.includes(Role.ADMIN)) {
    return sendForbidden(res, 'Only admin can unverify gyms');
  }

  try {
    const gym = await gymService.getGymById(id);
    if (!gym) {
      return sendNotFound(res, 'Gym not found');
    }
    const updatedGym = await gymService.setGymVerified(id, false);
    return sendSuccess(res, updatedGym);
  } catch (error) {
    logger.error(`Error unverifying gym with id: ${id}: ${error}`);
    return sendInternalError(res);
  }
};