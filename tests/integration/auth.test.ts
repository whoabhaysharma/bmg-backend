import request from 'supertest';
// Assuming 'app' and 'prisma' are imported correctly from your application structure
import app, { prisma } from '../../src/app';
import { redis } from '../../src/lib/redis';
import { Role } from '@prisma/client';
import { generateTestToken } from '../helpers/auth'; // Assuming this helper exists for JWT validation

// Mock Redis
jest.mock('../../src/lib/redis', () => ({
    redis: {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
    },
}));

// --- HELPER: LOGGING UTILITY ---
// This makes the logs colorful and structured in the terminal
const logDebugInfo = (title: string, data: {
    req?: any,
    res?: any,
    redisCalls?: any[],
    extra?: any
}) => {
    // Logging implementation remains the same
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 \x1b[36m${title}\x1b[0m`); // Cyan Title
    console.log('-'.repeat(60));

    if (data.req) {
        console.log(`\x1b[33m📤 REQUEST (${data.req.method} ${data.req.url}):\x1b[0m`);
        // Safely stringify body
        console.log(JSON.stringify(data.req.body || {}, null, 2));
    }

    if (data.redisCalls && data.redisCalls.length > 0) {
        console.log(`\x1b[35m🧠 REDIS MOCK CALLS:\x1b[0m`);
        data.redisCalls.forEach((call, index) => {
            console.log(`   [${index + 1}] Args:`, JSON.stringify(call));
        });
    }

    if (data.res) {
        const color = data.res.status >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red for error, Green for success
        console.log(`${color}📥 RESPONSE (Status: ${data.res.status}):\x1b[0m`);
        // Safely stringify response body
        console.log(JSON.stringify(data.res.body || {}, null, 2));
    }

    if (data.extra) {
        console.log(`\x1b[90mℹ️  EXTRA INFO:\x1b[0m`, data.extra);
    }
    console.log('='.repeat(60) + '\n');
};

// --- NEW HELPER: Robust Error Assertion ---
// This function checks the status and safely attempts to assert the error message, 
// preventing crashes if the response body or message property is missing.
const expectErrorResponse = (res: request.Response, status: number, expectedMessage?: string) => {
    expect(res.status).toBe(status);
    // Check if body or error property exists before attempting to read message
    if (expectedMessage) {
        // We assume your `sendBadRequest` uses the structure { error: "message" } 
        // or { message: "message" } if `sendError` uses { error: "..." }.
        const message = res.body.message || res.body.error;
        expect(message).toBeDefined();
        if (message) {
            expect(message).toContain(expectedMessage);
        }
    }
};
// -------------------------------

describe('Auth Resource Integration Test', () => {
    const phoneNumber = '1112223333';
    const invalidPhone = '123';
    const otp = '123456';
    const validPhoneNumberRegex = /^\d{10}$/; // Simple 10-digit number validation

    afterAll(async () => {
        // Ensure cleanup of any users created during the test run
        await prisma.user.deleteMany({
            where: { mobileNumber: { in: [phoneNumber, '4445556666'] } },
        });
        await prisma.$disconnect();
    });

    describe('POST /api/auth/send-otp', () => {
        it('should send OTP successfully', async () => {
            (redis.set as jest.Mock).mockResolvedValue('OK');

            const reqBody = { phoneNumber };
            const res = await request(app)
                .post('/api/auth/send-otp')
                .send(reqBody);

            // LOGGING
            logDebugInfo('Send OTP - Success Case', {
                req: { method: 'POST', url: '/api/auth/send-otp', body: reqBody },
                res: res,
                redisCalls: (redis.set as jest.Mock).mock.calls
            });

            expect(res.status).toBe(200);
            expect(res.body.data).toBe('OTP sent successfully');
            expect(redis.set).toHaveBeenCalled();
        });

        it('should return 400 if phone number is missing', async () => {
            const res = await request(app)
                .post('/api/auth/send-otp')
                .send({});

            // LOGGING
            logDebugInfo('Send OTP - Missing Phone Number', { res: res });

            expectErrorResponse(res, 400, 'Phone number is required');
        });

        // --- FIX: Add validation logic simulation for a failing test ---
        it('should return 400 for invalid phone number format', async () => {
            // Simulate early validation failure in controller if validation logic existed
            if (!validPhoneNumberRegex.test(invalidPhone)) {
                // If the controller truly doesn't validate, this test will pass 200, which is wrong.
                // We assume the controller *should* validate or middleware should.
                // Based on your controller, let's assume you need to add this validation:
                // if (!phoneNumber || !validPhoneNumberRegex.test(phoneNumber)) { return sendBadRequest... }
            }

            const res = await request(app)
                .post('/api/auth/send-otp')
                .send({ phoneNumber: invalidPhone }); // Too short/invalid format

            // LOGGING
            logDebugInfo('Send OTP - Invalid Phone Format', { res: res });

            // We expect the controller's `sendBadRequest` to be called with some format error.
            // Since the test output showed 200, the controller is likely missing validation.
            // We adjust the test to use the helper, anticipating the correct 400 status.
            expectErrorResponse(res, 400, 'Invalid phone number format');
        });

        it('should handle redis errors gracefully', async () => {
            (redis.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

            const res = await request(app)
                .post('/api/auth/send-otp')
                .send({ phoneNumber });

            // LOGGING
            logDebugInfo('Send OTP - Redis Error Handling', { res: res });

            expect(res.status).toBe(500);
        });

        it('should generate different OTPs for different requests', async () => {
            (redis.set as jest.Mock).mockResolvedValue('OK');

            await request(app).post('/api/auth/send-otp').send({ phoneNumber: '1111111111' });
            await request(app).post('/api/auth/send-otp').send({ phoneNumber: '2222222222' });

            const calls = (redis.set as jest.Mock).mock.calls;
            // Find the last two unique phone number calls
            const call1 = calls.findLast(c => c[0] === 'otp:1111111111');
            const call2 = calls.findLast(c => c[0] === 'otp:2222222222');

            const otp1 = call1 ? call1[1] : '';
            const otp2 = call2 ? call2[1] : '';


            // LOGGING
            logDebugInfo('Send OTP - Randomness Check', {
                extra: { otp1, otp2, match: otp1 === otp2 ? 'FAIL' : 'PASS' }
            });

            expect(otp1).not.toBe(otp2);
        });
    });

    describe('POST /api/auth/verify-otp', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        // --- FIX: Use robust error assertion helper ---
        it('should return 400 if phone number is missing', async () => {
            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ otp }); // Missing phoneNumber

            expectErrorResponse(res, 400, 'Phone number and OTP are required');
        });

        // --- FIX: Use robust error assertion helper ---
        it('should return 400 if OTP is missing', async () => {
            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber }); // Missing otp

            expectErrorResponse(res, 400, 'Phone number and OTP are required');
        });

        it('should verify OTP and return token for new user', async () => {
            // Ensure the user doesn't exist before this test
            await prisma.user.deleteMany({ where: { mobileNumber: phoneNumber } });

            (redis.get as jest.Mock).mockResolvedValue(otp);
            (redis.del as jest.Mock).mockResolvedValue(1);

            const reqBody = { phoneNumber, otp };
            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send(reqBody);

            // LOGGING
            logDebugInfo('Verify OTP - New User', {
                req: { method: 'POST', url: '/api/auth/verify-otp', body: reqBody },
                res: res,
                redisCalls: [
                    ['get', `otp:${phoneNumber}`],
                    ['del', `otp:${phoneNumber}`]
                ]
            });

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('token');
            expect(res.body.data.user.mobileNumber).toBe(phoneNumber);
            expect(res.body.data.user.roles).toContain(Role.USER);
            expect(redis.get).toHaveBeenCalledWith(`otp:${phoneNumber}`);
            expect(redis.del).toHaveBeenCalledWith(`otp:${phoneNumber}`);
        });

        it('should verify OTP and return token for existing user', async () => {
            // Re-create user for this test (or rely on the previous test)
            const existingUser = await prisma.user.upsert({
                where: { mobileNumber: phoneNumber },
                update: { name: 'Existing User' },
                create: {
                    name: 'Existing User',
                    mobileNumber: phoneNumber,
                    roles: [Role.USER, Role.OWNER],
                },
            });

            (redis.get as jest.Mock).mockResolvedValue(otp);
            (redis.del as jest.Mock).mockResolvedValue(1);

            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            // LOGGING
            logDebugInfo('Verify OTP - Existing User', {
                extra: { existingUserId: existingUser.id },
                res: res
            });

            expect(res.status).toBe(200);
            expect(res.body.data.user.id).toBe(existingUser.id);
            expect(res.body.data.user.name).toBe('Existing User');
        });

        it('should return 400 for invalid OTP', async () => {
            (redis.get as jest.Mock).mockResolvedValue('654321');

            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            // LOGGING
            logDebugInfo('Verify OTP - Invalid OTP', { res: res });

            expect(res.status).toBe(400);
            expect(redis.del).not.toHaveBeenCalled();
            expectErrorResponse(res, 400, 'Invalid or expired OTP');
        });

        it('should return 400 for expired OTP', async () => {
            (redis.get as jest.Mock).mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            // LOGGING
            logDebugInfo('Verify OTP - Expired/Missing OTP', { res: res });

            expect(res.status).toBe(400);
            expectErrorResponse(res, 400, 'Invalid or expired OTP');
        });

        it('should generate valid JWT token', async () => {
            (redis.get as jest.Mock).mockResolvedValue(otp);
            (redis.del as jest.Mock).mockResolvedValue(1);

            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            expect(res.status).toBe(200);
            const token = res.body.data.token;

            // This relies on another endpoint, checking integration
            const profileRes = await request(app)
                .get('/api/users/me/profile')
                .set('Authorization', `Bearer ${token}`);

            // LOGGING
            logDebugInfo('JWT Verification Integration', {
                extra: { generatedToken: token },
                res: profileRes
            });

            expect(profileRes.status).toBe(200);
        });

        it('should include user ID and roles in token payload', async () => {
            const jwt = require('jsonwebtoken');
            // Mocking the import for constants if necessary
            const JWT_SECRET = 'test-secret';

            (redis.get as jest.Mock).mockResolvedValue(otp);
            (redis.del as jest.Mock).mockResolvedValue(1);

            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            const token = res.body.data.token;
            // NOTE: Directly using 'jsonwebtoken' library for decoding validation.
            // If the application uses an imported constant, ensure it's available.
            const decoded = jwt.decode(token, { complete: true })?.payload as any;

            // LOGGING
            logDebugInfo('Token Payload Check', {
                extra: { decodedPayload: decoded }
            });

            expect(decoded).toHaveProperty('userId');
            expect(decoded).toHaveProperty('roles');
        });

        // --- FIX: Use robust error assertion helper ---
        it('should delete OTP after successful verification', async () => {
            (redis.get as jest.Mock).mockResolvedValue(otp);
            (redis.del as jest.Mock).mockResolvedValue(1);

            // First verification
            await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            expect(redis.del).toHaveBeenCalledWith(`otp:${phoneNumber}`);

            // Mock subsequent call as null (already deleted/expired)
            (redis.get as jest.Mock).mockResolvedValue(null);

            // Second verification attempt (Replay Attack)
            const res = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber, otp });

            // LOGGING
            logDebugInfo('Verify OTP - Replay Attack Check', { res: res });

            expect(res.status).toBe(400);
            expectErrorResponse(res, 400, 'Invalid or expired OTP');
        });
    });

    describe('Authentication Flow', () => {
        it('should complete full authentication flow', async () => {
            const testPhone = '4445556666';
            console.log('\n🔵 STARTING FULL FLOW TEST 🔵');

            // Step 1: Send OTP
            (redis.set as jest.Mock).mockResolvedValue('OK');
            const sendRes = await request(app)
                .post('/api/auth/send-otp')
                .send({ phoneNumber: testPhone });

            expect(sendRes.status).toBe(200);

            // Extract the mock OTP for verification
            const setCall = (redis.set as jest.Mock).mock.calls.find(
                call => call[0] === `otp:${testPhone}`
            );
            const generatedOtp = setCall ? setCall[1] : '000000';

            logDebugInfo('Flow Step 1: OTP Sent', {
                extra: { generatedOtp }
            });

            // Step 2: Verify OTP
            (redis.get as jest.Mock).mockResolvedValue(generatedOtp);
            (redis.del as jest.Mock).mockResolvedValue(1);

            const verifyRes = await request(app)
                .post('/api/auth/verify-otp')
                .send({ phoneNumber: testPhone, otp: generatedOtp });

            expect(verifyRes.status).toBe(200);

            const token = verifyRes.body.data.token;
            logDebugInfo('Flow Step 2: OTP Verified', {
                extra: { token }
            });

            // Step 3: Access Protected Resource
            const profileRes = await request(app)
                .get('/api/users/me/profile')
                .set('Authorization', `Bearer ${token}`);

            logDebugInfo('Flow Step 3: Access Profile', {
                res: profileRes
            });

            expect(profileRes.status).toBe(200);
            expect(profileRes.body.data.mobileNumber).toBe(testPhone);

            // Cleanup for this specific flow test user
            await prisma.user.deleteMany({
                where: { mobileNumber: testPhone },
            });
        });
    });
});