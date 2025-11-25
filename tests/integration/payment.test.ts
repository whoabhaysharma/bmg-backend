import request from 'supertest';
import app, { prisma } from '../../src/app';
import { generateTestToken } from '../helpers/auth';
import { paymentService } from '../../src/services/payment.service';
import { Role, PlanType, SubscriptionStatus, PaymentStatus } from '@prisma/client';

// Mock PaymentService
jest.mock('../../src/services/payment.service', () => ({
    paymentService: {
        createOrder: jest.fn(),
        verifyPaymentSignature: jest.fn(),
    },
}));

describe('Payment Resource Integration Test', () => {
    let userId: string;
    let userToken: string;
    let gymId: string;
    let planId: string;
    let subscriptionId: string;
    let paymentId: string;
    let razorpayOrderId: string;

    beforeAll(async () => {
        // Create User
        const user = await prisma.user.create({
            data: {
                name: 'Payment Test User',
                mobileNumber: '1234567890',
                roles: [Role.USER],
            },
        });
        userId = user.id;
        userToken = generateTestToken(user.id, [Role.USER]);

        // Create Owner
        const owner = await prisma.user.create({
            data: {
                name: 'Payment Test Owner',
                mobileNumber: '0987654321',
                roles: [Role.OWNER],
            },
        });

        // Create Gym
        const gym = await prisma.gym.create({
            data: {
                name: 'Payment Test Gym',
                ownerId: owner.id,
            },
        });
        gymId = gym.id;

        // Create Plan
        const plan = await prisma.gymSubscriptionPlan.create({
            data: {
                gymId: gym.id,
                name: 'Payment Test Plan',
                price: 2000,
                durationValue: 1,
                durationUnit: PlanType.MONTH,
            },
        });
        planId = plan.id;
    });

    afterAll(async () => {
        await prisma.payment.deleteMany({ where: { subscriptionId } });
        await prisma.subscription.deleteMany({ where: { gymId } });
        await prisma.gymSubscriptionPlan.deleteMany({ where: { gymId } });
        await prisma.gym.deleteMany({ where: { id: gymId } });
        await prisma.user.deleteMany({
            where: { mobileNumber: { in: ['1234567890', '0987654321'] } },
        });
        await prisma.$disconnect();
    });

    describe('POST /api/payments/verify', () => {
        beforeEach(async () => {
            // Create a subscription with pending payment
            razorpayOrderId = `order_${Date.now()}`;
            (paymentService.createOrder as jest.Mock).mockResolvedValue({
                id: razorpayOrderId,
            });

            const subscription = await prisma.subscription.create({
                data: {
                    userId,
                    gymId,
                    planId,
                    status: SubscriptionStatus.PENDING,
                    startDate: new Date(),
                    endDate: new Date(),
                    accessCode: 'TEST1234',
                },
            });
            subscriptionId = subscription.id;

            const payment = await prisma.payment.create({
                data: {
                    subscriptionId: subscription.id,
                    amount: 2000,
                    razorpayOrderId,
                    status: PaymentStatus.PENDING,
                },
            });
            paymentId = payment.id;
        });

        afterEach(async () => {
            await prisma.payment.deleteMany({ where: { id: paymentId } });
            await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
        });

        it('should verify payment with valid signature and activate subscription', async () => {
            (paymentService.verifyPaymentSignature as jest.Mock).mockReturnValue(true);

            const res = await request(app)
                .post('/api/payments/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: 'pay_test123',
                    razorpay_signature: 'sig_test123',
                });

            expect(res.status).toBe(200);
            expect(res.body.subscription.status).toBe(SubscriptionStatus.ACTIVE);

            // Verify payment was updated
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
            });
            expect(payment?.status).toBe(PaymentStatus.COMPLETED);
            expect(payment?.razorpayPaymentId).toBe('pay_test123');
        });

        it('should reject payment with invalid signature', async () => {
            (paymentService.verifyPaymentSignature as jest.Mock).mockReturnValue(false);

            const res = await request(app)
                .post('/api/payments/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: 'pay_invalid',
                    razorpay_signature: 'sig_invalid',
                });

            expect(res.status).toBe(500);

            // Verify payment was marked as failed
            const payment = await prisma.payment.findUnique({
                where: { id: paymentId },
            });
            expect(payment?.status).toBe(PaymentStatus.FAILED);
        });

        it('should return 400 if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/payments/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: razorpayOrderId,
                    // Missing payment_id and signature
                });

            expect(res.status).toBe(400);
        });

        it('should return 500 if payment record not found', async () => {
            const res = await request(app)
                .post('/api/payments/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: 'order_nonexistent',
                    razorpay_payment_id: 'pay_test',
                    razorpay_signature: 'sig_test',
                });

            expect(res.status).toBe(500);
        });

        it('should handle already completed payment gracefully', async () => {
            // Mark payment as completed
            await prisma.payment.update({
                where: { id: paymentId },
                data: { status: PaymentStatus.COMPLETED },
            });

            await prisma.subscription.update({
                where: { id: subscriptionId },
                data: { status: SubscriptionStatus.ACTIVE },
            });

            (paymentService.verifyPaymentSignature as jest.Mock).mockReturnValue(true);

            const res = await request(app)
                .post('/api/payments/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: 'pay_test123',
                    razorpay_signature: 'sig_test123',
                });

            expect(res.status).toBe(200);
            expect(res.body.subscription.status).toBe(SubscriptionStatus.ACTIVE);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/payments/verify')
                .send({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: 'pay_test',
                    razorpay_signature: 'sig_test',
                });

            expect(res.status).toBe(401);
        });

        it('should correctly calculate subscription end date', async () => {
            (paymentService.verifyPaymentSignature as jest.Mock).mockReturnValue(true);

            const beforeDate = new Date();

            const res = await request(app)
                .post('/api/payments/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: 'pay_test123',
                    razorpay_signature: 'sig_test123',
                });

            expect(res.status).toBe(200);

            const subscription = await prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: { plan: true },
            });

            expect(subscription?.status).toBe(SubscriptionStatus.ACTIVE);

            // Verify end date is approximately 1 month from start date
            const startDate = new Date(subscription!.startDate);
            const endDate = new Date(subscription!.endDate);
            const diffInDays = Math.floor(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Should be approximately 30 days (allowing for month variations)
            expect(diffInDays).toBeGreaterThanOrEqual(28);
            expect(diffInDays).toBeLessThanOrEqual(31);
        });
    });
});
