import 'dotenv/config';

// Set dummy env vars for testing if not present
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'test_key_id';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_key_secret';

// Global setup for Jest tests
console.log('Jest setup file loaded');
