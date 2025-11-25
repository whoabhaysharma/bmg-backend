import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';
import * as authService from '../services';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';

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

    const otp = await authService.generateOtp(phoneNumber);

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

    const isValid = await authService.verifyOtp(phoneNumber, otp);

    if (!isValid) {
      return sendBadRequest(res, 'Invalid or expired OTP');
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
