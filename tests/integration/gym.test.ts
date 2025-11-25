import request from 'supertest';
import winston from 'winston';
import app, { prisma } from '../../src/app';
import { generateTestToken } from '../helpers/auth';
import { Role } from '@prisma/client';

// ------------------------------------------------------------------
// WINSTON LOGGER SETUP (Simplified for minimal output)
// ------------------------------------------------------------------
const simpleFormat = winston.format.printf(({ level, message }) => {
    // Only print level and message for setup/teardown, no metadata/timestamp
    return `[${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
    level: 'info',
    // Use the simple format and ensure colors are used only for level
    format: winston.format.combine(
        winston.format.colorize(),
        simpleFormat
    ),
    transports: [
        new winston.transports.Console({
            // Set level to prevent excessive debug messages from Winston itself
            level: 'info'
        })
    ],
});

// ------------------------------------------------------------------
// MODIFIED: logInteraction now only logs the TEST NAME, no body/status details
// ------------------------------------------------------------------
const logInteraction = (testName: string, req: any, res: any) => {
    // Only print the test name with a separator for context
    console.log('\n' + '---' + ` 🧪 Running: ${testName} ` + '---');
};
// ------------------------------------------------------------------

describe('Gym Access Control Integration Test', () => {
    // User IDs
    let ownerOneId: string;
    let ownerTwoId: string;
    let adminId: string;

    // Tokens
    let ownerOneToken: string;
    let ownerTwoToken: string;
    let adminToken: string;

    // Resource IDs
    let gymOwnedByOne: string;

    beforeAll(async () => {
        logger.warn('🚀 STARTING SETUP: Creating users and tokens...');

        // 1. Create Owner One
        const owner1 = await prisma.user.create({
            data: { name: 'Owner One', mobileNumber: '1111111111', roles: [Role.OWNER] },
        });
        ownerOneId = owner1.id;
        ownerOneToken = generateTestToken(owner1.id, [Role.OWNER]);

        // 2. Create Owner Two (The "Attacker")
        const owner2 = await prisma.user.create({
            data: { name: 'Owner Two', mobileNumber: '2222222222', roles: [Role.OWNER] },
        });
        ownerTwoId = owner2.id;
        ownerTwoToken = generateTestToken(owner2.id, [Role.OWNER]);

        // 3. Create Admin
        const admin = await prisma.user.create({
            data: { name: 'Super Admin', mobileNumber: '3333333333', roles: [Role.ADMIN] },
        });
        adminId = admin.id;
        adminToken = generateTestToken(admin.id, [Role.ADMIN]);

        logger.info('✅ Setup Complete.');
    });

    afterAll(async () => {
        logger.warn('🛑 TEARDOWN PHASE: Cleaning up database...');
        // Clean up gyms first (FK constraints)
        await prisma.gym.deleteMany({
            where: { ownerId: { in: [ownerOneId, ownerTwoId, adminId] } }
        });
        // Clean up users
        await prisma.user.deleteMany({
            where: { id: { in: [ownerOneId, ownerTwoId, adminId] } }
        });
        await prisma.$disconnect();
        logger.info('✅ Teardown Complete.');
    });

    // --- TEST 1: OWNER 1 CREATES GYM ---
    it('should allow Owner One to create a gym', async () => {
        const payload = { name: 'Owner One Gym', address: '1st Street' };

        const res = await request(app)
            .post('/api/gyms')
            .set('Authorization', `Bearer ${ownerOneToken}`)
            .send(payload);

        logInteraction('Owner 1 Creates Gym', { method: 'POST', url: '/api/gyms', _data: payload }, res);

        expect(res.status).toBe(201);
        gymOwnedByOne = res.body.data.id;
    });

    // --- TEST 2: OWNER 2 TRIES TO UPDATE OWNER 1'S GYM (FAIL) ---
    it('should NOT allow Owner Two to update Owner One\'s gym', async () => {
        const payload = { name: 'Hacked By Owner Two' };

        const res = await request(app)
            .put(`/api/gyms/${gymOwnedByOne}`)
            .set('Authorization', `Bearer ${ownerTwoToken}`)
            .send(payload);

        logInteraction('Cross-Owner Update Attempt (Should Fail)', { method: 'PUT', url: `/api/gyms/${gymOwnedByOne}`, _data: payload }, res);

        expect(res.status).toBe(403); // Expect Forbidden
    });

    // --- TEST 3: ADMIN CREATES GYM ---
    it('should allow Admin to create a gym', async () => {
        const payload = { name: 'Admin Created Gym', address: 'Admin Blvd' };

        const res = await request(app)
            .post('/api/gyms')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payload);

        logInteraction('Admin Creates Gym', { method: 'POST', url: '/api/gyms', _data: payload }, res);

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Admin Created Gym');
    });

    // --- TEST 4: ADMIN UPDATES OWNER 1'S GYM ---
    it('should allow Admin to update Owner One\'s gym', async () => {
        const payload = { name: 'Updated by Admin' };

        const res = await request(app)
            .put(`/api/gyms/${gymOwnedByOne}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(payload);

        logInteraction('Admin Force Update Owner 1 Gym', { method: 'PUT', url: `/api/gyms/${gymOwnedByOne}`, _data: payload }, res);

        // NOTE: This test will only pass if the controller logic includes the Admin bypass.
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated by Admin');
    });

    // --- TEST 5: VERIFY PERSISTENCE ---
    it('should verify the gym name was actually changed by Admin', async () => {
        const res = await request(app)
            .get(`/api/gyms/${gymOwnedByOne}`)
            .set('Authorization', `Bearer ${ownerOneToken}`);

        logInteraction('Verify Update Persistence', { method: 'GET', url: `/api/gyms/${gymOwnedByOne}` }, res);

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated by Admin');
    });
});