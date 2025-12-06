import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    internalSecret: process.env.INTERNAL_SECRET,

    database: {
        url: process.env.DATABASE_URL,
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
    },

    admin: {
        phoneNumber: process.env.ADMIN_PHONE_NUMBER,
    },
};
