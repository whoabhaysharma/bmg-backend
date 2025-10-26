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
          mobileNumber: '', // User can update this later
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
    const { mobileNumber, name } = req.body;

    // Check if mobile number is already used by another user
    if (mobileNumber) {
      const existingUser = await prisma.user.findUnique({
        where: { mobileNumber }
      });

      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Mobile number already in use' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(mobileNumber && { mobileNumber }),
        ...(name && { name })
      }
    });

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};