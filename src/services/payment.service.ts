import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Ensures Razorpay keys are present at startup.
 */
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay environment variables: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a new order on Razorpay.
 * @param amount The amount in the standard currency unit (e.g., Rupees, not Paise).
 * @param receipt A unique receipt ID for the order.
 * @param currency The currency of the order. Defaults to 'INR'.
 * @returns The created Razorpay order object.
 * @throws An error if the order creation fails.
 */
export const createOrder = async (
  amount: number,
  receipt: string,
  currency: string = 'INR'
): Promise<any> => {
  // Razorpay expects the amount in the lowest denomination (e.g., Paise)
  const amountInLowestDenomination = Math.round(amount * 100);

  const options = {
    amount: amountInLowestDenomination,
    currency,
    receipt,
  };

  try {
    // The orders property might not be directly on the type definition,
    // so we use type assertion for the expected API structure.
    const order = await (razorpay as any).orders.create(options);
    return order;
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    // Re-throw a custom, simpler error for the caller
    throw new Error('PAYMENT_SERVICE_ERROR: Failed to create payment order');
  }
};

/**
 * Verifies the payment signature using the order ID, payment ID, and the received signature.
 * @param orderId The Razorpay order ID.
 * @param paymentId The Razorpay payment ID.
 * @param signature The signature received from the client/webhook.
 * @returns True if the signature is valid, false otherwise.
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const textToHash = orderId + '|' + paymentId;

  // Use the stored keySecret
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(textToHash)
    .digest('hex');

  return generatedSignature === signature;
};
