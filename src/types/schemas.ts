import { z } from 'zod';

// Payment Schemas
export const paymentProcessSchema = z.object({
  method: z.string(),
});

// Subscription Schemas
export const subscriptionCreateSchema = z.object({
  planId: z.string(),
  gymId: z.string(),
});

export type PaymentProcessInput = z.infer<typeof paymentProcessSchema>;
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;