import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { auth } from '../config/firebase.js';

const prisma = new PrismaClient();

interface FirebaseAuthRequest {
  firebaseToken: string; // ID token from Firebase
}

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { firebaseToken }: FirebaseAuthRequest = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    // Verify the Firebase ID token (this verifies Google signed it)
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    
    const { email, name, uid } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user if doesn't exist
      user = await prisma.user.create({
        data: {
          email,
          name: name || '',
          mobileNumber: '', // Use an empty string as a placeholder for optional field
          role: 'USER' // Default role
        }
      });
    }

    // Generate our own JWT token for the session
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobileNumber: user.mobileNumber
      },
      token
    });
  } catch (error: any) {
    console.error('Error in Google authentication:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ message: 'Token has been revoked' });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Optional: Update user profile (e.g., add mobile number after Google login)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, mobileNumber } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        mobileNumber
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const registerGymOwner = async (req: Request, res: Response) => {
  try {
    const { firebaseToken, gymName }: { firebaseToken: string; gymName: string } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    if (!gymName) {
      return res.status(400).json({ message: 'Gym name is required' });
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    
    const { email, name, uid } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      // Check if user exists and update role to OWNER, or create new user
      let user = await prisma.user.upsert({
        where: { email },
        update: {
          role: 'OWNER'
        },
        create: {
          email,
          name: name || '',
          mobileNumber: '', // Use an empty string as a placeholder for optional field
          role: 'OWNER'
        }
      });

      // Create the gym entry
      const gym = await prisma.gym.create({
        data: {
          name: gymName,
          ownerId: user.id,
          // Required fields with placeholder values until updated
          address: '',
          city: '',
          state: '',
          pincode: '',
          pricePerDay: 0
        }
      });

      return { user, gym };
    });

    // Generate JWT token for the session
    const token = jwt.sign(
      { 
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Gym owner registered successfully',
      user: result.user,
      gym: result.gym,
      token
    });

  } catch (error) {
    console.error('Error registering gym owner:', error);
    res.status(500).json({ message: 'Failed to register gym owner' });
  }
};