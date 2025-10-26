import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, CreateGymInput } from '../types/index.js';

const prisma = new PrismaClient();

export const createGym = async (req: AuthRequest, res: Response) => {
  try {
    const gymData: CreateGymInput = req.body;
    const ownerId = req.userId;

    if (!ownerId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const gym = await prisma.gym.create({
      data: {
        ...gymData,
        ownerId
      }
    });

    res.status(201).json(gym);
  } catch (error) {
    console.error('Error creating gym:', error);
    res.status(500).json({ message: 'Error creating gym' });
  }
};

export const getGym = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const gym = await prisma.gym.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            mobileNumber: true
          }
        }
      }
    });

    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    res.json(gym);
  } catch (error) {
    console.error('Error fetching gym:', error);
    res.status(500).json({ message: 'Error fetching gym' });
  }
};

export const listGyms = async (req: Request, res: Response) => {
  try {
    const { city, state, minPrice, maxPrice } = req.query;
    
    const where = {
      ...(city && { city: String(city) }),
      ...(state && { state: String(state) }),
      ...(minPrice && { pricePerDay: { gte: Number(minPrice) } }),
      ...(maxPrice && { pricePerDay: { lte: Number(maxPrice) } })
    };

    const gyms = await prisma.gym.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(gyms);
  } catch (error) {
    console.error('Error listing gyms:', error);
    res.status(500).json({ message: 'Error listing gyms' });
  }
};

export const updateGym = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: Partial<CreateGymInput> = req.body;
    const userId = req.userId;

    const gym = await prisma.gym.findUnique({
      where: { id }
    });

    if (!gym) {
      return res.status(404).json({ message: 'Gym not found' });
    }

    if (gym.ownerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this gym' });
    }

    const updatedGym = await prisma.gym.update({
      where: { id },
      data: updateData
    });

    res.json(updatedGym);
  } catch (error) {
    console.error('Error updating gym:', error);
    res.status(500).json({ message: 'Error updating gym' });
  }
};