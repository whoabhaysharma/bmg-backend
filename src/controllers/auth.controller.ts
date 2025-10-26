import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CreateUserInput } from '../types/index.js';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const userData: CreateUserInput = req.body;

    // Check if user with mobile number already exists
    const existingUser = await prisma.user.findUnique({
      where: { mobileNumber: userData.mobileNumber }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this mobile number already exists' });
    }

    // If email is provided, check if it's unique
    if (userData.email) {
      const userWithEmail = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (userWithEmail) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }

    const user = await prisma.user.create({
      data: userData
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { mobileNumber } = req.body;

    const user = await prisma.user.findUnique({
      where: { mobileNumber }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // In a real application, you would verify password here
    // For now, we're just using mobile number for simplicity

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};