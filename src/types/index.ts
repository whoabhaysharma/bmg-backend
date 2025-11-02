import { Role } from '@prisma/client';
import { Request } from 'express';

export interface CreateUserInput {
  name?: string;
  mobileNumber: string;
  email?: string;
  role?: Role;
}

export interface CreateGymInput {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  images: string[];
  pricePerDay: number;
}

export interface CreateBookingInput {
  gymId: string;
  startDate: Date;
  endDate: Date;
}

export interface CreatePaymentInput {
  bookingId: string;
  amount: number;
  currency?: string;
  provider?: string;
}

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: Role;
}