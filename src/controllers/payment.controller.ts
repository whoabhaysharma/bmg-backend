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
