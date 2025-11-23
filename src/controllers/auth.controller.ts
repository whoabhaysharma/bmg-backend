import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';
import * as authService from '../services/auth.service';

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

    const otp = await authService.generateOtp(phoneNumber);

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

    const isValid = await authService.verifyOtp(phoneNumber, otp);

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await authService.findOrCreateUser(phoneNumber);

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name,
        roles: user.roles,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        roles: user.roles,
      },
    });

  } catch (error) {
    logger.error('Error verifying OTP', error);
    next(error);
  }
};
