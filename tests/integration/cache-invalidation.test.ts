import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/lib/prisma';
import { Role } from '@prisma/client';
import { generateToken } from './helpers/auth';

describe('Cache Invalidation - Permission Changes', () => {
    let testUser: any;
    let authToken: string;

    beforeAll(async () => {
        // Create a test user with USER role only
        testUser = await prisma.user.create({
            data: {
                name: 'Cache Test User',
                mobileNumber: '+919999999999',
                roles: [Role.USER],
            },
        });

        authToken = generateToken(testUser.id, testUser.roles);
    });

    afterAll(async () => {
        // Cleanup
        if (testUser) {
            await prisma.user.delete({ where: { id: testUser.id } });
        }
    });

    it('should reflect role changes immediately after cache invalidation', async () => {
        // Step 1: Verify user initially doesn't have ADMIN role
        const initialResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(initialResponse.status).toBe(200);
        expect(initialResponse.body.roles).not.toContain(Role.ADMIN);

        // Step 2: Add ADMIN role using the service (which invalidates cache)
        const { userService } = await import('../src/services');
        await userService.addRole(testUser.id, Role.ADMIN);

        // Step 3: Generate new token with updated roles
        const updatedUser = await prisma.user.findUnique({
            where: { id: testUser.id },
        });
        const newAuthToken = generateToken(updatedUser!.id, updatedUser!.roles);

        // Step 4: Verify the role change is reflected immediately
        const updatedResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${newAuthToken}`);

        expect(updatedResponse.status).toBe(200);
        expect(updatedResponse.body.roles).toContain(Role.ADMIN);
    });

    it('should detect stale cache based on updatedAt timestamp', async () => {
        // Step 1: Make a request to cache the user
        const firstResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(firstResponse.status).toBe(200);
        const firstUpdatedAt = firstResponse.body.updatedAt;

        // Step 2: Wait a moment and update user directly in database
        await new Promise(resolve => setTimeout(resolve, 100));

        await prisma.user.update({
            where: { id: testUser.id },
            data: { name: 'Updated Cache Test User' },
        });

        // Step 3: Make another request - should get fresh data due to updatedAt check
        const secondResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.name).toBe('Updated Cache Test User');
        expect(secondResponse.body.updatedAt).not.toBe(firstUpdatedAt);
    });

    it('should prevent authentication after soft delete', async () => {
        // Step 1: Verify user can authenticate
        const beforeDeleteResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(beforeDeleteResponse.status).toBe(200);

        // Step 2: Soft delete the user (which invalidates cache)
        const { userService } = await import('../src/services');
        await userService.deleteUser(testUser.id);

        // Step 3: Try to authenticate - should fail
        const afterDeleteResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(afterDeleteResponse.status).toBe(401);

        // Step 4: Restore user for cleanup
        await userService.restoreUser(testUser.id);
    });

    it('should allow authentication after restore', async () => {
        // Step 1: Soft delete the user
        const { userService } = await import('../src/services');
        await userService.deleteUser(testUser.id);

        // Step 2: Verify authentication fails
        const deletedResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(deletedResponse.status).toBe(401);

        // Step 3: Restore the user (which invalidates cache)
        await userService.restoreUser(testUser.id);

        // Step 4: Verify authentication works again
        const restoredResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(restoredResponse.status).toBe(200);
    });
});
