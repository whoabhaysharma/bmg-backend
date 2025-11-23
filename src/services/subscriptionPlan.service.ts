import prisma from '../lib/prisma'; // Adjust this path to your actual prisma client instance
import { PlanType } from '@prisma/client';

export const SubscriptionPlanService = {
  /**
   * Get all plans (Admin use)
   */
  async getAllPlans() {
    return prisma.gymSubscriptionPlan.findMany({
      include: {
        gym: true,
        subscriptions: true,
      },
    });
  },

  /**
   * Get a single plan by ID
   */
  async getPlanById(id: string) {
    return prisma.gymSubscriptionPlan.findUnique({
      where: { id },
      include: {
        gym: true,
        subscriptions: true,
      },
    });
  },

  /**
   * Get all plans for a specific Gym (Owner view)
   */
  async getPlansByGym(gymId: string) {
    return prisma.gymSubscriptionPlan.findMany({
      where: { gymId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get only ACTIVE plans for the public page
   * Sorted by Price (Lowest to Highest)
   */
  async getActivePlansByGym(gymId: string) {
    return prisma.gymSubscriptionPlan.findMany({
      where: { gymId, isActive: true },
      // Sorting by price is better than duration when units are mixed (Days vs Months)
      orderBy: { price: 'asc' }, 
    });
  },

  /**
   * Create a new flexible plan
   */
  async createPlan(data: { 
    gymId: string; 
    name: string; 
    description?: string; 
    price: number;
    // New Flexible Fields
    durationValue: number;
    durationUnit?: PlanType; 
  }) {
    // Validate durationValue is a positive integer
    if (!Number.isInteger(data.durationValue) || data.durationValue <= 0) {
      throw new Error('durationValue must be a positive integer');
    }

    const durationUnit = data.durationUnit ?? PlanType.MONTH;

    return prisma.gymSubscriptionPlan.create({
      data: {
        gymId: data.gymId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        durationValue: data.durationValue,
        durationUnit,
        isActive: true,
      },
    });
  },

  /**
   * Update an existing plan
   */
  async updatePlan(id: string, data: Partial<{ 
    name: string; 
    description: string; 
    price: number; 
    isActive: boolean;
    durationValue: number;
    durationUnit: PlanType;
  }>) {
    return prisma.gymSubscriptionPlan.update({
      where: { id },
      data,
    });
  },

  /**
   * Soft delete or Hard delete (depending on your preference)
   * Currently hard delete as per your code
   */
  async deletePlan(id: string) {
    return prisma.gymSubscriptionPlan.delete({
      where: { id },
    });
  },
};