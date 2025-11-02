import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const { email, name, uid } = decodedToken;
    if (!email) {
      return res.status(400).json({ message: 'Email not found in token' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email }, include: { userRoles: true } });
    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || '',
          googleId: uid,
        },
        include: { userRoles: true },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId: uid },
        include: { userRoles: true },
      });
    }

    // Sign JWT with empty roles for new users, existing roles for existing users
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
      }
    });
  } catch (error) {
    next(error);
  }
};