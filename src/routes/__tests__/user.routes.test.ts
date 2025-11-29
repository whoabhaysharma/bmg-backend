import request from 'supertest';
import express from 'express';
import {
  getMyProfile,
  updateMyProfile,
} from '../../controllers/user.controller';
import { prismaMock } from '../../tests/setup';

// Mock the authentication middleware
jest.mock('../../middleware/isAuthenticated', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isAuthenticated: (req: any, res: any, next: any) => {
    // Populate the user object as expected by the controller
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      roles: ['USER'],
    };
    next();
  },
}));

// We need to import the mocked middleware to use it in our express app setup
import { isAuthenticated } from '../../middleware/isAuthenticated';

const app = express();
app.use(express.json());
// Mount routes with the middleware
app.get('/api/users/me', isAuthenticated, getMyProfile);
app.put('/api/users/me', isAuthenticated, updateMyProfile);

describe('User Routes Integration', () => {
  describe('GET /api/users/me', () => {
    it('should return 200 and user profile', async () => {
      const mockUser = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        userRoles: [{ role: 'USER' }],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const response = await request(app).get('/api/users/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('test-user-id');
    });

    it('should return 404 if user not found in DB', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/api/users/me');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should return 200 and updated profile', async () => {
      const mockUser = {
        id: 'test-user-id',
        name: 'Updated Name',
        userRoles: [{ role: 'USER' }],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.user.update.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .put('/api/users/me')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });
  });
});
