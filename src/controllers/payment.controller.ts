import { Request, Response } from 'express';
import { subscriptionService } from '../services';
import { paymentService } from '../services/payment.service';

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // --- TEST EXPECTATION: exact error message ---
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res
        .status(400)
        .json({ message: 'All Razorpay fields are required' });
    }

    // --- TEST EXPECTATION: invalid signature -> 400 ---
    const isValid = paymentService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res
        .status(400)
        .json({ message: 'Payment verification failed' });
    }

    // If signature is valid, activate subscription
    const subscription = await subscriptionService.handlePaymentSuccess(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    // --- TEST EXPECTATION: must respond as { data: { subscription } } ---
    return res.status(200).json({
      data: {
        subscription,
      },
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);

    // If internal error thrown inside service (mocked in tests)
    return res
      .status(500)
      .json({ message: error.message || 'Payment verification failed' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log('Webhook Received:', {
      signature,
      secretSet: !!secret,
      bodyType: typeof req.body,
      rawBodyType: typeof (req as any).rawBody
    });

    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    if (!paymentService.verifyWebhookSignature((req as any).rawBody, signature, secret)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body;
    console.log('Webhook Event:', event.event);

    if (event.event === 'payment.captured' || event.event === 'order.paid' || event.event === 'payment.authorized') {
      const paymentEntity = event.payload.payment.entity;
      console.log('Payment Entity:', JSON.stringify(paymentEntity, null, 2));

      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const notes = paymentEntity.notes;
      const subscriptionId = notes?.subscriptionId;

      console.log('Extracted Data:', { orderId, paymentId, notes, subscriptionId });

      // We don't have the frontend signature here, but we have verified the webhook signature.
      // We can pass a placeholder or modify handlePaymentSuccess to accept trusted calls.
      // For now, let's pass 'WEBHOOK_VERIFIED' as signature.

      await subscriptionService.handlePaymentSuccess(
        orderId,
        paymentId,
        'WEBHOOK_VERIFIED',
        subscriptionId
      );
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

import prisma from '../lib/prisma';

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { gymId, userId, source, status, settlementStatus, startDate, endDate, page, limit } = req.query;
    const user = (req as any).user;
    const userRoles = user.roles || [];

    let filterGymId: string | string[] | undefined = gymId as string;

    if (userRoles.includes('ADMIN')) {
      // Admin can filter freely. If gymId is provided, use it.
    } else if (userRoles.includes('OWNER')) {
      // Owner Logic
      if (filterGymId) {
        // Verify ownership of the specific gym
        const gym = await prisma.gym.findUnique({
          where: { id: filterGymId as string },
          select: { ownerId: true }
        });

        if (!gym || gym.ownerId !== user.id) {
          return res.status(403).json({ message: 'Not authorized to view payments for this gym' });
        }
      } else {
        // No gymId provided, fetch ALL gyms owned by this user
        const myGyms = await prisma.gym.findMany({
          where: { ownerId: user.id },
          select: { id: true }
        });

        if (myGyms.length === 0) {
          // Owner has no gyms, so no payments
          return res.status(200).json({
            data: [],
            meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
          });
        }

        filterGymId = myGyms.map(g => g.id);
      }
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const filters = {
      gymId: filterGymId,
      userId: userId as string,
      source: source as any,
      status: status as string,
      settlementStatus: settlementStatus as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    };

    const result = await paymentService.getAllPayments(filters);
    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Get all payments error:', error);
    return res.status(500).json({ message: 'Failed to fetch payments' });
  }
};
