import { Request, Response } from 'express';
import { getMyProfile, updateMyProfile } from '../user.controller';
import { prismaMock } from '../../tests/setup';

describe('User Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    res = {
      status,
      json,
    };
  });

  describe('getMyProfile', () => {
    it('should return user profile when user is authenticated', async () => {
      const user = {
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        mobileNumber: '1234567890',
        googleId: 'google123',
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{ role: 'USER' }],
      };

      req = {
        user: { id: 'user1' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.user.findUnique.mockResolvedValue(user as any);

      await getMyProfile(req as Request, res as Response, jest.fn());

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: expect.any(Object),
      });
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user1',
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should return 404 if user not found', async () => {
      req = {
        user: { id: 'user1' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      prismaMock.user.findUnique.mockResolvedValue(null);

      await getMyProfile(req as Request, res as Response, jest.fn());

      expect(status).toHaveBeenCalledWith(404);
    });

    it('should return 401 if user id missing', async () => {
      req = {
        user: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      await getMyProfile(req as Request, res as Response, jest.fn());

      expect(status).toHaveBeenCalledWith(401);
    });
  });

  describe('updateMyProfile', () => {
    it('should update user profile successfully', async () => {
      const user = {
        id: 'user1',
        name: 'Updated Name',
        mobileNumber: '9876543210',
        email: 'test@example.com',
        userRoles: [{ role: 'USER' }],
      };

      req = {
        user: { id: 'user1' },
        body: { name: 'Updated Name', mobileNumber: '9876543210' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prismaMock.user.update.mockResolvedValue(user as any);

      await updateMyProfile(req as Request, res as Response, jest.fn());

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { name: 'Updated Name', mobileNumber: '9876543210' },
        select: expect.any(Object),
      });
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Updated Name',
            mobileNumber: '9876543210',
          }),
        })
      );
    });
  });
});
