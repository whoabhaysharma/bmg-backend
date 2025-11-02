import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info('Processing Google authentication request');
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      logger.warn('Firebase token is required, but was not provided.');
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    // Verify the Firebase ID token
    logger.info('Verifying Firebase ID token');
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const { email, name, uid } = decodedToken;
    if (!email) {
      logger.warn('Email not found in Firebase token');
      return res.status(400).json({ message: 'Email not found in token' });
    }

    // Find or create user
    logger.info(`Finding or creating user for email: ${email}`);
    let user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: true },
    });
    const isNewUser = !user;

    if (!user) {
      logger.info(`Creating new user for email: ${email}`);
      user = await prisma.user.create({
        data: {
          email,
          name: name || '',
          googleId: uid,
        },
        include: { userRoles: true },
      });
    } else if (!user.googleId) {
      logger.info(`Updating user ${user.id} with Google ID`);
      user = await prisma.user.update({
        where: { email },
        data: { googleId: uid },
        include: { userRoles: true },
      });
    }

    // Sign JWT with empty roles for new users, existing roles for existing users
    logger.info(`Signing JWT for user ${user.id}`);
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        roles: isNewUser ? [] : user.userRoles.map((userRole) => userRole.role),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        roles: isNewUser ? [] : user.userRoles.map((userRole) => userRole.role),
      },
    });
  } catch (error) {
    logger.error('Error during Google authentication', error);
    next(error);
  }
};
