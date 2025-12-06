import { Request, Response } from 'express';
// import { subscriptionService } from '../services';
import { paymentService, subscriptionService } from '@services';
import { PaymentQueue } from '@queues';
import prisma from '../lib/prisma';

/*
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
*/


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

    // Add to queue for asynchronous processing
    await PaymentQueue.add(event);
    console.log('Payment event added to queue');

    return res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};

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

export const testPaymentFlow = async (req: Request, res: Response) => {
  try {
    const { userId, planId, gymId } = req.body;

    if (!userId || !planId || !gymId) {
      return res.status(400).json({ message: 'userId, planId, and gymId are required' });
    }

    // 1. Create Subscription (mimics frontend calling create subscription)
    const { subscription, order } = await subscriptionService.createSubscription(userId, planId, gymId);

    // 2. Simulate Payment Success Payload (mimics Razorpay webhook)
    const paymentId = `pay_test_${Math.random().toString(36).substring(7)}`;
    const event = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: "payment",
            amount: order.amount,
            currency: "INR",
            status: "captured",
            order_id: order.id,
            invoice_id: null,
            international: false,
            method: "card",
            amount_refunded: 0,
            refund_status: null,
            captured: true,
            description: "Test Transaction",
            card_id: "card_test",
            bank: null,
            wallet: null,
            vpa: null,
            email: "test@example.com",
            contact: "+919999999999",
            notes: {
              subscriptionId: subscription.id
            },
            fee: 100,
            tax: 18,
            error_code: null,
            error_description: null,
            error_source: null,
            error_step: null,
            error_reason: null,
            acquirer_data: {
              auth_code: "123456"
            },
            created_at: Math.floor(Date.now() / 1000)
          }
        }
      },
      created_at: Math.floor(Date.now() / 1000)
    };

    // 3. Generate Signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not set');
    }

    const payloadString = JSON.stringify(event);
    // @ts-ignore
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    // 4. Call Webhook Endpoint
    const port = process.env.PORT || 4000;
    const webhookUrl = `http://localhost:${port}/api/payments/webhook`;

    console.log(`Triggering webhook at ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      body: payloadString
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook call failed: ${response.status} ${errorText}`);
    }

    return res.status(200).json({
      message: 'Test payment flow completed successfully',
      data: {
        subscriptionId: subscription.id,
        orderId: order.id,
        paymentId: paymentId,
        amount: order.amount,
        webhookStatus: response.status
      }
    });

  } catch (error: any) {
    console.error('Test payment flow error:', error);
    return res.status(500).json({ message: error.message || 'Test payment flow failed' });
  }
};
