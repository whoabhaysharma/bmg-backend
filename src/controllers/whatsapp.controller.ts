import { Request, Response } from 'express';
import { userService, gymService, planService, paymentService, subscriptionService } from '../services';
import { sendSuccess, sendBadRequest, sendInternalError, sendNotFound } from '../utils/response';
import { SubscriptionSource, SubscriptionStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export const checkUser = async (req: Request, res: Response) => {
    try {
        const { mobile } = req.query;
        if (!mobile) return sendBadRequest(res, 'Mobile number required');

        const user = await userService.getUserByMobile(mobile as string);
        if (!user) {
            // Create user if not exists (minimal)
            const newUser = await userService.createUser({
                mobileNumber: mobile as string,
                name: 'WhatsApp User', // Placeholder
            });
            return sendSuccess(res, newUser);
        }
        return sendSuccess(res, user);
    } catch (error) {
        return sendInternalError(res, 'Failed to check user');
    }
};

export const getGyms = async (_req: Request, res: Response) => {
    try {
        const result = await gymService.getAllGyms();
        return sendSuccess(res, result);
    } catch (error) {
        return sendInternalError(res, 'Failed to fetch gyms');
    }
};

export const getPlans = async (req: Request, res: Response) => {
    try {
        const { gymId } = req.query;
        if (!gymId) return sendBadRequest(res, 'Gym ID required');

        const result = await planService.getPlansByGym(gymId as string);
        return sendSuccess(res, result);
    } catch (error) {
        return sendInternalError(res, 'Failed to fetch plans');
    }
};

export const createWhatsappSubscription = async (req: Request, res: Response) => {
    try {
        const { mobile, planId, gymId } = req.body;
        if (!mobile || !planId || !gymId) return sendBadRequest(res, 'Missing required fields');

        let user = await userService.getUserByMobile(mobile);
        if (!user) {
            user = await userService.createUser({
                mobileNumber: mobile,
                name: 'WhatsApp User',
            });
        }

        const plan = await planService.getPlanById(planId);
        if (!plan) return sendNotFound(res, 'Plan not found');

        const gym = await gymService.getGymById(gymId);
        if (!gym) return sendNotFound(res, 'Gym not found');

        // Use subscription service to create subscription (handles validation and payment order)
        const { subscription } = await subscriptionService.createSubscription(
            user.id,
            planId,
            gymId,
            SubscriptionSource.WHATSAPP
        );

        // Create Payment Link for WhatsApp flow
        const paymentLink = await paymentService.createPaymentLink(
            plan.price,
            `Subscription for ${plan.name} at ${gym.name}`,
            {
                name: user.name || 'Gym Member',
                contact: user.mobileNumber || '',
                email: 'user@example.com'
            },
            subscription.id // Reference ID
        );

        return sendSuccess(res, { subscription, paymentLink });

    } catch (error: any) {
        console.error("Create Sub Error:", error);
        return sendInternalError(res, error.message || 'Failed to create subscription');
    }
};

export const checkSubscription = async (req: Request, res: Response) => {
    try {
        const { mobile } = req.query;
        if (!mobile) return sendBadRequest(res, 'Mobile number required');

        const user = await userService.getUserByMobile(mobile as string);
        if (!user) return sendNotFound(res, 'User not found');

        const subscription = await prisma.subscription.findFirst({
            where: {
                userId: user.id,
                status: SubscriptionStatus.ACTIVE,
                endDate: { gte: new Date() },
            },
            include: {
                plan: true,
                gym: true,
            },
            orderBy: { endDate: 'desc' }
        });

        if (!subscription) return sendSuccess(res, null); // No active subscription

        return sendSuccess(res, subscription);
    } catch (error) {
        return sendInternalError(res, 'Failed to check subscription');
    }
};
