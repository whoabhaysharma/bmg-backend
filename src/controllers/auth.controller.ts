import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';
import { redis } from '../lib/redis';

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info('Processing Send OTP request');
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const otp = generateOTP();
    const key = `otp:${phoneNumber}`;

    // Store OTP in Redis with 5 minutes expiration (300 seconds)
    await redis.set(key, otp, { ex: 300 });

    // In a real application, you would send this OTP via SMS provider (e.g., Twilio)
    // For now, we'll log it to the console for testing
    logger.info(`Generated OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    logger.error('Error sending OTP', error);
    next(error);
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info('Processing Verify OTP request');
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const key = `otp:${phoneNumber}`;
    const storedOtp = await redis.get(key);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP verified, delete it from Redis
    await redis.del(key);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { mobileNumber: phoneNumber },
      include: { userRoles: true },
    });

    const isNewUser = !user;

    if (!user) {
      logger.info(`Creating new user for phone: ${phoneNumber}`);
      // Create a new user with just the mobile number. 
      // Name and email can be updated later by the user.
      user = await prisma.user.create({
        data: {
          mobileNumber: phoneNumber,
          name: '', // Placeholder, user should update profile
        },
        include: { userRoles: true },
      });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
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
        mobileNumber: user.mobileNumber,
        roles: isNewUser ? [] : user.userRoles.map((userRole) => userRole.role),
      },
    });

  } catch (error) {
    logger.error('Error verifying OTP', error);
    next(error);
  }
};
