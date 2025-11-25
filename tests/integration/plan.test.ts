import request from 'supertest';
import { generateTestToken } from '../helpers/auth';
import { Role, PlanType } from '@prisma/client';
import prisma from '../../src/lib/prisma';
import app from '../../src/app';

describe('Plan Resource Integration Test', () => {
    let ownerId: string;
    let adminId: string;
    let ownerToken: string;
    let otherOwnerToken: string;
    let adminToken: string;
    let gymId: string;
    let planId: string; // Used for general CRUD tests
    let planIdToDelete: string; // Used for specific deletion tests

    beforeAll(async () => {
        // 1. Owner 1 (Primary Test Subject)
        const owner = await prisma.user.create({
            data: {
                name: 'Plan Owner',
                mobileNumber: '3333333333',
                roles: [Role.OWNER],
            },
        });
        ownerId = owner.id;
        ownerToken = generateTestToken(owner.id, [Role.OWNER]);

        // 2. Owner 2 (Cross-Access Test Subject)
        const otherOwner = await prisma.user.create({
            data: {
                name: 'Other Owner',
                mobileNumber: '4444444444',
                roles: [Role.OWNER],
            },
        });
        otherOwnerToken = generateTestToken(otherOwner.id, [Role.OWNER]);

        // 3. Admin User (Override Test Subject)
        const admin = await prisma.user.create({
            data: {
                name: 'Plan Admin',
                mobileNumber: '5555555555',
                roles: [Role.ADMIN],
            },
        });
        adminId = admin.id;
        adminToken = generateTestToken(admin.id, [Role.ADMIN]);

        // Create Gym for Owner 1
        const gym = await prisma.gym.create({
            data: {
                name: 'Plan Test Gym',
                ownerId: owner.id,
            },
        });
        gymId = gym.id;

        // Create a separate plan for deletion test
        const planToDelete = await prisma.gymSubscriptionPlan.create({
            data: {
                gymId,
                name: 'Delete Me Plan',
                price: 100,
                durationValue: 1,
                durationUnit: PlanType.DAY,
            },
        });
        planIdToDelete = planToDelete.id;
    });

    afterAll(async () => {
        // Clean up everything created
        await prisma.gymSubscriptionPlan.deleteMany({ where: { gymId } });
        await prisma.gym.deleteMany({ where: { ownerId } });
        await prisma.user.deleteMany({
            where: { mobileNumber: { in: ['3333333333', '4444444444', '5555555555'] } }
        });
        await prisma.$disconnect();
    });

    // --- CREATE TESTS ---
    it('should allow Gym Owner to create a plan', async () => {
        const res = await request(app)
            .post('/api/plans')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                gymId,
                name: 'Gold Plan',
                description: 'Best plan',
                price: 5000,
                durationValue: 1,
                durationUnit: PlanType.MONTH,
            });

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Gold Plan');
        expect(res.body.data.gymId).toBe(gymId);
        planId = res.body.data.id; // Store ID for subsequent tests
    });

    it('should NOT allow another Owner to create a plan for this gym (403 Forbidden)', async () => {
        const res = await request(app)
            .post('/api/plans')
            .set('Authorization', `Bearer ${otherOwnerToken}`)
            .send({
                gymId,
                name: 'Hacker Plan',
                price: 100,
                durationValue: 1,
                durationUnit: PlanType.MONTH,
            });

        // The authorization layer should block this, likely resulting in 403 or 400 if the gym is not owned by the user
        expect(res.status).toBe(403);
    });

    it('should allow Admin to create a plan for the owner\'s gym', async () => {
        const res = await request(app)
            .post('/api/plans')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                gymId,
                name: 'Admin Gold Plan',
                price: 6000,
                durationValue: 1,
                durationUnit: PlanType.MONTH,
            });

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Admin Gold Plan');
        expect(res.body.data.gymId).toBe(gymId);
    });

    // --- READ/GET TESTS ---

    it('should allow Owner to fetch their created plan by ID', async () => {
        const res = await request(app)
            .get(`/api/plans/${planId}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(planId);
        expect(res.body.data.name).toBe('Gold Plan');
    });

    it('should NOT allow another Owner to fetch the plan by ID', async () => {
        const res = await request(app)
            .get(`/api/plans/${planId}`)
            .set('Authorization', `Bearer ${otherOwnerToken}`);

        expect([403, 404]).toContain(res.status); // Should be forbidden or not found
    });

    // --- UPDATE TESTS ---

    it('should allow Gym Owner to update their plan', async () => {
        const res = await request(app)
            .put(`/api/plans/${planId}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                name: 'Platinum Plan',
                price: 7500,
                isActive: false
            });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Platinum Plan');
        expect(res.body.data.price).toBe(7500);
        expect(res.body.data.isActive).toBe(false);
    });

    it('should NOT allow another Owner to update the plan', async () => {
        const res = await request(app)
            .put(`/api/plans/${planId}`)
            .set('Authorization', `Bearer ${otherOwnerToken}`)
            .send({
                name: 'Hacked Platinum',
                price: 1,
            });

        expect(res.status).toBe(403);
    });

    it('should allow Admin to update the Owner\'s plan', async () => {
        const res = await request(app)
            .put(`/api/plans/${planId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                price: 9000, // Admin sets a new high price
                isActive: true
            });

        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(9000);
        expect(res.body.data.isActive).toBe(true);
    });

    // --- DELETE TESTS ---

    it('should NOT allow another Owner to delete the plan', async () => {
        const res = await request(app)
            .delete(`/api/plans/${planIdToDelete}`)
            .set('Authorization', `Bearer ${otherOwnerToken}`);

        expect(res.status).toBe(403);
    });

    it('should allow Admin to delete the plan', async () => {
        const res = await request(app)
            .delete(`/api/plans/${planIdToDelete}`)
            .set('Authorization', `Bearer ${adminToken}`);

        // Expect 204 No Content for a successful deletion
        expect(res.status).toBe(204);
    });

    it('should verify the plan was actually deleted by Admin', async () => {
        const res = await request(app)
            .get(`/api/plans/${planIdToDelete}`)
            .set('Authorization', `Bearer ${ownerToken}`); // Owner should no longer find it

        expect(res.status).toBe(404);
    });

    it('should allow the owner to delete their plan', async () => {
        // We use the main planId which was modified in previous tests
        const res = await request(app)
            .delete(`/api/plans/${planId}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(204);
    });
});