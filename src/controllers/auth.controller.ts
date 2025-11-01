import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../config/firebase.js';
import prisma from '../lib/prisma.js';
import { Role, User, UserRole } from '@prisma/client';

interface FirebaseAuthRequest {
  firebaseToken: string; // ID token from Firebase
}

// Helper function to generate JWT token
const generateToken = (user: any) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Basic signup/login with Google
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { firebaseToken }: FirebaseAuthRequest = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    // Verify the Firebase ID token (this verifies Google signed it)
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    
    const { email, name } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: true
      }
    });

    if (!user) {
      // Create new user if doesn't exist (without any role)
      user = await prisma.user.create({
        data: {
          email,
          name: name || '',
          mobileNumber: '', // Use an empty string as a placeholder for optional field
        },
        include: {
          userRoles: true
        }
      });
    }

    // Generate our own JWT token for the session
    const token = generateToken(user);

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

// Assign role to user
export const assignRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role }: { role: Role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if role already assigned
    const existingRole = user.roles.find(r => r.role === role);
    if (existingRole) {
      return res.status(400).json({ message: 'User already has this role' });
    }

    // Assign new role
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        role
      }
    });

    res.json({
      message: 'Role assigned successfully',
      userRole
    });

  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ message: 'Failed to assign role' });
  }
};

// Register gym owner with role check
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
    
    const { email, name } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    console.log('Decoded Firebase token:', decodedToken);
    console.log('Starting transaction to register gym owner...');

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (prisma) => {
      console.log('Checking if user exists by email or mobileNumber...');

      // Check if user exists by email or mobileNumber
      let existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { mobileNumber: '' } // Replace with actual mobileNumber if available
          ]
        }
      });

      if (existingUser) {
        console.log('User already exists:', existingUser);
        // Update the role to OWNER if not already
        if (existingUser.role !== 'OWNER') {
          existingUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: 'OWNER' }
          });
        }
      } else {
        console.log('Creating a new user...');
        existingUser = await prisma.user.create({
          data: {
            email,
            name: name || '',
            role: 'OWNER',
            mobileNumber: '' // Provide mobileNumber if available
          }
        });
      }

      console.log('User processed successfully:', existingUser);

      // Create the gym entry
      let gym;
      try {
        gym = await prisma.gym.create({
          data: {
            name: gymName,
            ownerId: existingUser.id,
            // Required fields with placeholder values until updated
            address: '',
            city: '',
            state: '',
            pincode: '',
            pricePerDay: 0
          }
        });
      } catch (error) {
        console.error('Error during gym creation:', error);
        throw error;
      }

      console.log('Gym creation successful:', gym);

      return { user: existingUser, gym };
    });

    console.log('Transaction completed successfully:', result);

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