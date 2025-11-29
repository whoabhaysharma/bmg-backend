import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================
export const googleAuthSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

// ============================================================================
// USER SCHEMAS
// ============================================================================
export const userUpdateProfileSchema = z.object({
  name: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional(),
});

export type UserUpdateProfileInput = z.infer<typeof userUpdateProfileSchema>;

// ============================================================================
// GYM SCHEMAS
// ============================================================================
export const gymCreateSchema = z.object({
  name: z.string().min(1, 'Gym name is required'),
  address: z.string().optional(),
});

export const gymUpdateSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
});

export type GymCreateInput = z.infer<typeof gymCreateSchema>;
export type GymUpdateInput = z.infer<typeof gymUpdateSchema>;

// ============================================================================
// PLAN SCHEMAS
// ============================================================================
export const planCreateSchema = z.object({
  gymId: z.string().min(1, 'Gym ID is required'),
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  durationInMonths: z.number().int().positive('Duration must be positive'),
  price: z.number().int().nonnegative('Price must be non-negative'),
});

export const planUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  durationInMonths: z.number().int().positive().optional(),
  price: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

// ============================================================================
// SUBSCRIPTION SCHEMAS
// ============================================================================
export const subscriptionCreateSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  gymId: z.string().min(1, 'Gym ID is required'),
});

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================
export const paymentProcessSchema = z.object({
  method: z.enum(['CARD', 'UPI', 'BANK_TRANSFER', 'WALLET']).optional(),
});

export type PaymentProcessInput = z.infer<typeof paymentProcessSchema>;

// ============================================================================
// ATTENDANCE SCHEMAS
// ============================================================================
export const attendanceCheckInSchema = z.object({
  gymId: z.string().min(1, 'Gym ID is required'),
});

export type AttendanceCheckInInput = z.infer<typeof attendanceCheckInSchema>;
