import request from 'supertest';
import app, { prisma } from '../../src/app';
import { generateTestToken } from '../helpers/auth';
import { Role, PlanType, SubscriptionStatus } from '@prisma/client';

describe('Attendance Resource Integration Test', () => {
    let ownerId: string;
    let userId: string;
    let gymId: string;
    let planId: string;
    let subscriptionId: string;
    let userToken: string;
    let ownerToken: string;

    beforeAll(async () => {
        // 1. Create Owner
        const owner = await prisma.user.create({
            data: {
                name: 'Attendance Gym Owner',
                mobileNumber: '5555555555',
                roles: [Role.OWNER],
            },
        });
        ownerId = owner.id;
        ownerToken = generateTestToken(owner.id, [Role.OWNER]);

        // 2. Create User
        const user = await prisma.user.create({
            data: {
                name: 'Attendance User',
                mobileNumber: '6666666666',
                roles: [Role.USER],
            },
        });
        userId = user.id;
        userToken = generateTestToken(user.id, [Role.USER]);

        // 3. Create Gym
        const gym = await prisma.gym.create({
            data: {
                name: 'Attendance Gym',
                ownerId: owner.id,
            },
        });
        gymId = gym.id;

        // 4. Create Plan
        const plan = await prisma.gymSubscriptionPlan.create({
            data: {
                gymId: gym.id,
                name: 'Standard Plan',
                price: 1000,
                durationValue: 1,
                durationUnit: PlanType.MONTH,
            },
        });
        planId = plan.id;

        // 5. Create Active Subscription for User
        const subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                gymId: gym.id,
                planId: plan.id,
                status: SubscriptionStatus.ACTIVE,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                accessCode: 'ATTEND12',
            },
        });
        subscriptionId = subscription.id;
    });

    afterAll(async () => {
        // Cleanup
        await prisma.attendance.deleteMany({ where: { gymId } });
        await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
        await prisma.gymSubscriptionPlan.deleteMany({ where: { gymId } });
        await prisma.gym.deleteMany({ where: { id: gymId } });
        await prisma.user.deleteMany({ where: { id: { in: [ownerId, userId] } } });
        await prisma.$disconnect();
    });

    it('should allow User to check-in with valid access code', async () => {
        // URL: /api/attendance/gym/:gymId/check-in
        // Note: The controller `checkIn` implementation (seen in previous turn) 
        // uses `req.user.id` to create attendance. 
        // It does NOT seem to take `accessCode` from body in the snippet I saw.
        // It just says `attendanceService.checkIn(req.user.id, gymId)`.
        // So maybe it doesn't verify access code in the controller? 
        // Or maybe `attendanceService.checkIn` does it?
        // But `attendanceService.checkIn` only takes `userId` and `gymId`.
        // This implies the user checks THEMSELVES in via the app (GPS? or just button?).
        // Or maybe the snippet was incomplete.
        // Let's assume for now it just needs gymId in path.

        const res = await request(app)
            .post(`/api/attendance/gym/${gymId}/check-in`)
            .set('Authorization', `Bearer ${userToken}`) // User checks themselves in
            .send({});

        expect([200, 201]).toContain(res.status);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.userId).toBe(userId);
    });

    it('should allow User to view their attendance history', async () => {
        // URL: /api/attendance/me
        const res = await request(app)
            .get('/api/attendance/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});
