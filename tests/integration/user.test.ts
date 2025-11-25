import request from 'supertest';
import app, { prisma } from '../../src/app';
import { generateTestToken } from '../helpers/auth';
import { Role } from '@prisma/client';

describe('User Resource Integration Test', () => {
    let adminId: string;
    let adminToken: string;
    let userId: string;
    let userToken: string;
    let ownerId: string;
    let ownerToken: string;

    beforeAll(async () => {
        // Create Admin User
        const admin = await prisma.user.create({
            data: {
                name: 'Admin User',
                mobileNumber: '7777777777',
                roles: [Role.ADMIN],
            },
        });
        adminId = admin.id;
        adminToken = generateTestToken(admin.id, [Role.ADMIN]);

        // Create Regular User
        const user = await prisma.user.create({
            data: {
                name: 'Regular User',
                mobileNumber: '8888888888',
                roles: [Role.USER],
            },
        });
        userId = user.id;
        userToken = generateTestToken(user.id, [Role.USER]);

        // Create Owner User
        const owner = await prisma.user.create({
            data: {
                name: 'Owner User',
                mobileNumber: '9999999999',
                roles: [Role.OWNER],
            },
        });
        ownerId = owner.id;
        ownerToken = generateTestToken(owner.id, [Role.OWNER]);
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: {
                id: { in: [adminId, userId, ownerId] },
            },
        });
        await prisma.$disconnect();
    });

    describe('GET /api/users/me/profile', () => {
        it('should allow authenticated user to get their own profile', async () => {
            const res = await request(app)
                .get('/api/users/me/profile')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('id', userId);
            expect(res.body.data).toHaveProperty('mobileNumber', '8888888888');
        });

        it('should return 401 for unauthenticated request', async () => {
            const res = await request(app).get('/api/users/me/profile');

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/users/me/profile', () => {
        it('should allow user to update their own profile', async () => {
            const res = await request(app)
                .put('/api/users/me/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Updated User Name' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Updated User Name');
        });
    });

    describe('GET /api/users', () => {
        it('should allow ADMIN to get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('meta');
            expect(Array.isArray(res.body.data.data)).toBe(true);
        });

        it('should NOT allow regular USER to get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });

        it('should support pagination', async () => {
            const res = await request(app)
                .get('/api/users?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.meta.page).toBe(1);
            expect(res.body.data.meta.limit).toBe(2);
        });
    });

    describe('GET /api/users/:id', () => {
        it('should allow user to get their own data', async () => {
            const res = await request(app)
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(userId);
        });

        it('should allow ADMIN to get any user data', async () => {
            const res = await request(app)
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(userId);
        });

        it('should NOT allow user to get other user data', async () => {
            const res = await request(app)
                .get(`/api/users/${ownerId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/users/:id', () => {
        it('should allow user to update their own data', async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Self Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Self Updated Name');
        });

        it('should allow ADMIN to update any user', async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Admin Updated Name' });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('Admin Updated Name');
        });

        it('should NOT allow regular user to update roles', async () => {
            const res = await request(app)
                .put(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ roles: [Role.ADMIN] });

            expect(res.status).toBe(200);
            // Roles should not be updated
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user?.roles).not.toContain(Role.ADMIN);
        });

        it('should NOT allow user to update other users', async () => {
            const res = await request(app)
                .put(`/api/users/${ownerId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ name: 'Hacker Name' });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/users/:id', () => {
        let deleteTestUserId: string;

        beforeEach(async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Delete Test User',
                    mobileNumber: `delete${Date.now()}`,
                    roles: [Role.USER],
                },
            });
            deleteTestUserId = user.id;
        });

        it('should allow ADMIN to soft delete a user', async () => {
            const res = await request(app)
                .delete(`/api/users/${deleteTestUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            const user = await prisma.user.findUnique({
                where: { id: deleteTestUserId },
            });
            expect(user?.deletedAt).not.toBeNull();
        });

        it('should allow user to delete themselves', async () => {
            const selfToken = generateTestToken(deleteTestUserId, [Role.USER]);
            const res = await request(app)
                .delete(`/api/users/${deleteTestUserId}`)
                .set('Authorization', `Bearer ${selfToken}`);

            expect(res.status).toBe(200);
        });
    });

    describe('POST /api/users/:id/restore', () => {
        let deletedUserId: string;

        beforeEach(async () => {
            const user = await prisma.user.create({
                data: {
                    name: 'Restore Test User',
                    mobileNumber: `restore${Date.now()}`,
                    roles: [Role.USER],
                    deletedAt: new Date(),
                },
            });
            deletedUserId = user.id;
        });

        it('should allow ADMIN to restore a deleted user', async () => {
            const res = await request(app)
                .post(`/api/users/${deletedUserId}/restore`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);

            const user = await prisma.user.findUnique({
                where: { id: deletedUserId },
            });
            expect(user?.deletedAt).toBeNull();
        });

        it('should NOT allow regular user to restore users', async () => {
            const res = await request(app)
                .post(`/api/users/${deletedUserId}/restore`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/users/:id/role', () => {
        it('should allow ADMIN to add role to user', async () => {
            const res = await request(app)
                .post(`/api/users/${userId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: Role.OWNER, action: 'add' });

            expect(res.status).toBe(200);
            expect(res.body.data.roles).toContain(Role.OWNER);
        });

        it('should allow ADMIN to remove role from user', async () => {
            // First add a role
            await prisma.user.update({
                where: { id: userId },
                data: { roles: [Role.USER, Role.OWNER] },
            });

            const res = await request(app)
                .post(`/api/users/${userId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: Role.OWNER, action: 'remove' });

            expect(res.status).toBe(200);
            expect(res.body.data.roles).not.toContain(Role.OWNER);
        });

        it('should NOT allow regular user to modify roles', async () => {
            const res = await request(app)
                .post(`/api/users/${userId}/role`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: Role.ADMIN, action: 'add' });

            expect(res.status).toBe(403);
        });

        it('should return 400 for invalid action', async () => {
            const res = await request(app)
                .post(`/api/users/${userId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: Role.OWNER, action: 'invalid' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/users/:id/profile', () => {
        it('should get user profile with relations', async () => {
            const res = await request(app)
                .get(`/api/users/${userId}/profile`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('gymsOwned');
            expect(res.body.data).toHaveProperty('subscriptions');
        });

        it('should allow ADMIN to view any user profile', async () => {
            const res = await request(app)
                .get(`/api/users/${ownerId}/profile`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });

        it('should NOT allow user to view other user profiles', async () => {
            const res = await request(app)
                .get(`/api/users/${ownerId}/profile`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).toBe(403);
        });
    });
});
