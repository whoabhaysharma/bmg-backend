import { auth } from '../config/firebase';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';

export interface GoogleAuthResult {
  token: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    googleId: string | null;
    roles: string[];
  };
}

/**
 * Service class for authentication operations
 * Handles Google OAuth authentication for all user types (ADMIN, OWNER, USER)
 */
export class AuthService {
  /**
   * Authenticate user via Google Firebase token
   * Creates new user if doesn't exist, assigns default USER role
   * @param firebaseToken - Firebase ID token from client
   * @returns Authentication result with JWT token and user data
   */
  async googleAuth(firebaseToken: string): Promise<GoogleAuthResult> {
    logger.info('Verifying Firebase ID token');

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const { email, name, uid } = decodedToken;

    if (!email) {
      logger.warn('Email not found in Firebase token');
      throw new Error('Email not found in token');
    }

    // Find or create user
    logger.info(`Finding or creating user for email: ${email}`);
    let user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: true },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user with default setup
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
      // Update existing user with Google ID
      logger.info(`Updating user ${user.id} with Google ID`);
      user = await prisma.user.update({
        where: { email },
        data: { googleId: uid },
        include: { userRoles: true },
      });
    }

    // Extract roles
    const roles = isNewUser ? [] : user.userRoles.map((userRole) => userRole.role);

    // Generate JWT token
    logger.info(`Signing JWT for user ${user.id}`);
    const token = this.generateJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      googleId: user.googleId,
      roles,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleId: user.googleId,
        roles,
      },
    };
  }

  /**
   * Generate JWT token with user data
   * @param payload - User data to encode in token
   * @returns JWT token string
   */
  private generateJWT(payload: {
    userId: string;
    email: string | null;
    name: string | null;
    googleId: string | null;
    roles: string[];
  }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload
   */
  verifyJWT(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }
}

export const authService = new AuthService();
