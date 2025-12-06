import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import logger from '../lib/logger';
import { AuthService } from '@services';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';

// Simple validation regex for 10 digits. This should ideally be moved to a constants/util file.
const PHONE_NUMBER_REGEX = /^\d{10}$/;

export const sendOtp = async (
  req: Request,
  res: Response
) => {
  logger.info('Processing Send OTP request');
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return sendBadRequest(res, 'Phone number is required');
    }

    // --- FIX: Add phone number format validation ---
    // Normalize: Strip '91' prefix if present
    if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
      req.body.phoneNumber = phoneNumber.substring(2);
    }

    const normalizedPhoneNumber = req.body.phoneNumber;

    if (!PHONE_NUMBER_REGEX.test(normalizedPhoneNumber)) {
      return sendBadRequest(res, 'Invalid phone number format. Must be 10 digits.');
    }
    // ---------------------------------------------

    const otp = await AuthService.generateOtp(phoneNumber);

    // In a real application, you would send this OTP via SMS provider (e.g., Twilio)
    // For now, we'll log it to the console for testing
    logger.info(`Generated OTP for ${phoneNumber}: ${otp}`);

    sendSuccess(res, 'OTP sent successfully');
  } catch (error) {
    logger.error('Error sending OTP', error);
    sendError(res, 'Failed to send OTP');
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response
) => {
  logger.info('Processing Verify OTP request');
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return sendBadRequest(res, 'Phone number and OTP are required');
    }

    const isValid = await AuthService.verifyOtp(phoneNumber, otp);

    if (!isValid) {
      return sendBadRequest(res, 'Invalid or expired OTP');
    }

    const user = await AuthService.findOrCreateUser(phoneNumber);

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name,
        roles: user.roles,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    sendSuccess(res, {
      message: 'OTP verified successfully',
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
    sendError(res, 'Failed to verify OTP');
  }
};

export const createMagicLink = async (req: Request, res: Response) => {
  try {
    let { phoneNumber } = req.body;
    if (!phoneNumber) return sendBadRequest(res, 'Phone number is required');

    // Normalize: Strip '91' prefix if present
    if (phoneNumber.startsWith('91') && phoneNumber.length === 12) {
      phoneNumber = phoneNumber.substring(2);
    }

    const token = await AuthService.generateMagicToken(phoneNumber);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const magicLink = `${frontendUrl}/booking?token=${token}`;

    return sendSuccess(res, { magicLink });
  } catch (error) {
    logger.error('Error creating magic link', error);
    return sendError(res, 'Failed to create magic link');
  }
};

export const loginWithMagicLink = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return sendBadRequest(res, 'Token is required');

    const user = await AuthService.verifyMagicToken(token);
    if (!user) return sendBadRequest(res, 'Invalid or expired token');

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        name: user.name,
        roles: user.roles,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return sendSuccess(res, {
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        roles: user.roles,
      },
    });
  } catch (error) {
    logger.error('Error logging in with magic link', error);
    return sendError(res, 'Failed to login with magic link');
  }
};