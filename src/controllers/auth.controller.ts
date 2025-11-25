import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/constants';
import logger from '../lib/logger';
import { AuthService } from '../services';
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
    if (!PHONE_NUMBER_REGEX.test(phoneNumber)) {
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