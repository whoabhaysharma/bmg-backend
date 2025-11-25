import request from 'supertest';
import app from '../src/app';
import * as authService from '../src/services';
import { redis } from '../src/lib/redis';

jest.mock('../src/services');
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('../src/services/payment.service', () => ({}));
jest.mock('../src/services/subscription.service', () => ({}));
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

describe('Auth Routes', () => {
  describe('POST /api/auth/send-otp', () => {
    it('should send an OTP to the user', async () => {
      (authService.generateOtp as jest.Mock).mockResolvedValue('123456');

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phoneNumber: '1234567890' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('data', 'OTP sent successfully');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify the OTP and return a token', async () => {
      (authService.verifyOtp as jest.Mock).mockResolvedValue(true);
      (authService.findOrCreateUser as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Test User',
        mobileNumber: '1234567890',
        roles: ['USER'],
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '1234567890', otp: '123456' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toHaveProperty('id', '1');
    });
  });
});
