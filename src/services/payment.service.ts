import Razorpay from 'razorpay';
import crypto from 'crypto';

// Ensure env keys exist
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay environment variables: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const paymentService = {
  // Create Razorpay order
  async createOrder(amount: number, receipt: string, currency = 'INR') {
    const amountInPaise = Math.round(amount * 100);

    try {
      const order = await (razorpay as any).orders.create({
        amount: amountInPaise,
        currency,
        receipt,
      });

      return order;
    } catch (err) {
      console.error('Razorpay Order Creation Error:', err);
      throw new Error('PAYMENT_SERVICE_ERROR: Failed to create payment order');
    }
  },

  // Verify payment signature
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    const payload = `${orderId}|${paymentId}`;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(payload)
      .digest('hex');

    return expected === signature;
  },
};
