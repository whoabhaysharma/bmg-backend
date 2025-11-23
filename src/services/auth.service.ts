import { redis } from '../lib/redis';
import prisma from '../lib/prisma';
import { User } from '@prisma/client';

export const generateOtp = async (phoneNumber: string): Promise<string> => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${phoneNumber}`, otp, { ex: 300 }); // OTP expires in 5 minutes
  return otp;
};

export const verifyOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  const storedOtp = await redis.get(`otp:${phoneNumber}`);
  console.log('Stored OTP:', storedOtp);
  console.log('Provided OTP:', otp);
  if (storedOtp === otp) {
    await redis.del(`otp:${phoneNumber}`); // Remove OTP after successful verification
    return true;
  }
  return false;
};

export const findOrCreateUser = async (phoneNumber: string): Promise<User> => {
  let user = await prisma.user.findUnique({
    where: { mobileNumber: phoneNumber },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        mobileNumber: phoneNumber,
        name: '', // Placeholder, user should update profile
      },
    });
  }
  return user;
};