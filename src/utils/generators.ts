import { randomBytes } from 'crypto';

export const generateAccessCode = (): string => {
    // Generate a 6-digit numeric code
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateReferralCode = (): string => {
    return randomBytes(4).toString('hex').toUpperCase();
};
