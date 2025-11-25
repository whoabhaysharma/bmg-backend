import request from 'supertest';
import app from '../src/app';
import * as gymService from '../src/services';
import { redis } from '../src/lib/redis';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/constants';

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

describe('Gym Routes', () => {
  let token: string;

  beforeAll(() => {
    token = jwt.sign({ userId: '1', roles: ['OWNER'] }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  describe('POST /api/gyms', () => {
    it('should create a new gym', async () => {
      (gymService.createGym as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Test Gym',
        address: '123 Test St',
      });

      const res = await request(app)
        .post('/api/gyms')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Gym', address: '123 Test St' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.data).toHaveProperty('id', '1');
      expect(res.body.data).toHaveProperty('name', 'Test Gym');
    });
  });

  describe('GET /api/gyms', () => {
    it('should return all gyms', async () => {
      (gymService.getAllGyms as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Test Gym', address: '123 Test St' },
      ]);

      const res = await request(app)
        .get('/api/gyms')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/gyms/:id', () => {
    it('should return a gym by id', async () => {
      (gymService.getGymById as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Test Gym',
        address: '123 Test St',
      });

      const res = await request(app)
        .get('/api/gyms/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveProperty('id', '1');
    });
  });

  describe('PUT /api/gyms/:id', () => {
    it('should update a gym', async () => {
      (gymService.updateGym as jest.Mock).mockResolvedValue({
        id: '1',
        name: 'Updated Gym',
        address: '456 Test St',
      });

      const res = await request(app)
        .put('/api/gyms/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Gym', address: '456 Test St' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveProperty('name', 'Updated Gym');
    });
  });

  describe('DELETE /api/gyms/:id', () => {
    it('should delete a gym', async () => {
      (gymService.deleteGym as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/gyms/1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(204);
    });
  });
});
