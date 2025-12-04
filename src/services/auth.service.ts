import { redis } from '../lib/redis';
import prisma from '../lib/prisma';
import { User } from '@prisma/client';

export const AuthService = {
  async generateOtp(phoneNumber: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`otp:${phoneNumber}`, otp, 'EX', 300); // OTP expires in 5 minutes
    return otp;
  },

  async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const storedOtp = await redis.get(`otp:${phoneNumber}`);
    console.log('Stored OTP:', storedOtp);
    console.log('Provided OTP:', otp);
    if (storedOtp === otp) {
      await redis.del(`otp:${phoneNumber}`); // Remove OTP after successful verification
      return true;
    }
    return false;
  },

  async findOrCreateUser(phoneNumber: string): Promise<User> {
    let normalizedMobile = String(phoneNumber);
    if (normalizedMobile.startsWith('91') && normalizedMobile.length === 12) {
      normalizedMobile = normalizedMobile.substring(2);
    }

    let user = await prisma.user.findUnique({
      where: { mobileNumber: normalizedMobile },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          mobileNumber: normalizedMobile,
          name: '', // Placeholder, user should update profile
        },
      });
    }
    return user;
  },

  async generateMagicToken(phoneNumber: string): Promise<string> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await redis.set(`magic_token:${token}`, phoneNumber, 'EX', 900); // Expires in 15 minutes
    return token;
  },

  async verifyMagicToken(token: string): Promise<User | null> {
    const phoneNumber = await redis.get(`magic_token:${token}`);
    if (!phoneNumber) return null;

    await redis.del(`magic_token:${token}`); // One-time use

    return this.findOrCreateUser(phoneNumber as string);
  }
}

