import { Response, Request, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../middleware/isAuthenticated';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

// Helper function to safely access user from request
const getAuthUser = (req: Request) => {
  const authReq = req as AuthenticatedRequest;
  return authReq.user;
};

// Create a new gym
export const createGym: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, address } = req.body;
    
    if (!authReq.user?.id) {
      logger.error('User ID not found in request');
      return res.status(401).json({
        success: false,
        data: null,
        error: 'User not authenticated',
      });
    }
    
    const ownerId = authReq.user.id;

    // Only OWNER role can create gym (enforced by isOwner middleware in routes)
    const gym = await prisma.gym.create({
      data: {
        name,
        address,
        ownerId,
      },
    });

    logger.info(`Successfully created gym with id: ${gym.id}`);
    res.status(201).json({
      success: true,
      data: gym,
      error: null,
    });
  } catch (error) {
    logger.error(`Error creating gym: ${error}`);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};

// Get all gyms
export const getAllGyms: RequestHandler = async (req, res) => {
  const user = getAuthUser(req);
  logger.info('Fetching all gyms', { userId: user?.id });
  try {
    const gyms = await prisma.gym.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('Successfully fetched all gyms');
    res.status(200).json({
      success: true,
      data: gyms,
      error: null,
    });
  } catch (error) {
    logger.error(`Error fetching all gyms: ${error}`);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};

// Get my gyms (where user is owner)
export const getMyGyms: RequestHandler = async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user?.id) {
      logger.error('User ID not found in request');
      return res.status(401).json({
        success: false,
        data: null,
        error: 'User not authenticated',
      });
    }

    const userId = authReq.user.id;
    logger.info(`Fetching gyms owned by user: ${userId}`);

    const myGyms = await prisma.gym.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptionPlans: {
          select: {
            id: true,
            name: true,
            price: true,
            durationInMonths: true,
            isActive: true,
          },
        },
        subscribers: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    logger.info(`Successfully fetched ${myGyms.length} gyms for user: ${userId}`);
    res.status(200).json({
      success: true,
      data: myGyms,
      error: null,
    });
  } catch (error) {
    logger.error(`Error fetching user's gyms: ${error}`);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};

// Get a single gym by ID
export const getGymById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  logger.info(`Fetching gym with id: ${id}`);
  try {
    const gym = await prisma.gym.findUnique({
      where: {
        id,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptionPlans: true,
      },
    });

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Gym not found',
      });
    }

    logger.info(`Successfully fetched gym with id: ${id}`);
    res.status(200).json({
      success: true,
      data: gym,
      error: null,
    });
  } catch (error) {
    logger.error(`Error fetching gym with id: ${id}: ${error}`);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};

// Update a gym
export const updateGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  
  if (!user?.id) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'User not authenticated',
    });
  }

  logger.info(`Updating gym with id: ${id}`, { userId: user.id });
  try {
    const { name, address } = req.body;
    const ownerId = user.id;

    const gym = await prisma.gym.findUnique({
      where: { id },
    });

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Gym not found',
      });
    }

    if (gym.ownerId !== ownerId) {
      logger.warn(`User ${ownerId} is not authorized to update gym with id: ${id}`);
      return res.status(403).json({
        success: false,
        data: null,
        error: 'You are not authorized to update this gym',
      });
    }

    const updatedGym = await prisma.gym.update({
      where: { id },
      data: { name, address },
    });

    logger.info(`Successfully updated gym with id: ${id}`);
    res.status(200).json({
      success: true,
      data: updatedGym,
      error: null,
    });
  } catch (error) {
    logger.error(`Error updating gym with id: ${id}: ${error}`);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};

// Delete a gym
export const deleteGym: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const user = getAuthUser(req);
  
  if (!user?.id) {
    return res.status(401).json({
      success: false,
      data: null,
      error: 'User not authenticated',
    });
  }

  logger.info(`Deleting gym with id: ${id}`, { userId: user.id });
  try {
    const ownerId = user.id;
    const gym = await prisma.gym.findUnique({
      where: { id },
    });

    if (!gym) {
      logger.warn(`Gym not found with id: ${id}`);
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Gym not found',
      });
    }

    if (gym.ownerId !== ownerId) {
      logger.warn(`User ${ownerId} is not authorized to delete gym with id: ${id}`);
      return res.status(403).json({
        success: false,
        data: null,
        error: 'You are not authorized to delete this gym',
      });
    }

    await prisma.gym.delete({
      where: { id },
    });

    logger.info(`Successfully deleted gym with id: ${id}`);
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting gym with id: ${id}: ${error}`);
    res.status(500).json({
      success: false,
      data: null,
      error: 'Internal server error',
    });
  }
};
