import { Request, Response } from 'express';
import { subscriptionService } from '../services';

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    // These IDs are typically sent by the client after a successful payment callback
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing required payment details' });
    }

    // This service call handles payment verification with the gateway and
    // updates the subscription status to 'active' or 'successful' in the DB.
    const subscription = await subscriptionService.handlePaymentSuccess(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.status(200).json({
      message: 'Payment verified and subscription activated',
      subscription,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message || 'Payment verification failed' });
  }
};