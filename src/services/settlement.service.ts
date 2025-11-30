import { PrismaClient, SettlementStatus, PaymentStatus, SubscriptionSource } from '@prisma/client';
import { notificationService } from './notification.service';
import { NotificationEvent } from '../types/notification-events';

const prisma = new PrismaClient();

export const settlementService = {
    // Get Unsettled Payments (Online payments not yet settled)
    async getUnsettledPayments(gymId: string) {
        return prisma.payment.findMany({
            where: {
                subscription: {
                    gymId,
                    source: SubscriptionSource.APP, // Only Online payments
                },
                status: PaymentStatus.COMPLETED,
                settlementId: null,
            },
            include: {
                subscription: {
                    include: {
                        user: { select: { name: true, mobileNumber: true } },
                        plan: { select: { name: true } },
                    },
                },
            },
        });
    },

    // Create Settlement (Admin action)
    async createSettlement(gymId: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Find unsettled payments
            const unsettledPayments = await tx.payment.findMany({
                where: {
                    subscription: {
                        gymId,
                        source: SubscriptionSource.APP,
                    },
                    status: PaymentStatus.COMPLETED,
                    settlementId: null,
                },
            });

            if (unsettledPayments.length === 0) {
                throw new Error('No unsettled payments found for this gym');
            }

            // 2. Calculate total
            const totalAmount = unsettledPayments.reduce((sum, p) => sum + p.amount, 0);

            // 3. Create Settlement
            const settlement = await tx.settlement.create({
                data: {
                    gymId,
                    amount: totalAmount,
                    status: SettlementStatus.PENDING,
                },
                include: {
                    gym: {
                        select: {
                            name: true,
                            ownerId: true,
                        },
                    },
                },
            });

            // 4. Link payments to settlement
            await tx.payment.updateMany({
                where: {
                    id: { in: unsettledPayments.map((p) => p.id) },
                },
                data: {
                    settlementId: settlement.id,
                },
            });

            // ✅ Event-based notification - Settlement Created
            await notificationService.notifyUser(
                settlement.gym.ownerId,
                NotificationEvent.SETTLEMENT_CREATED,
                {
                    amount: settlement.amount,
                    gymName: settlement.gym.name
                }
            );

            return settlement;
        });
    },

    // Get Settlements
    async getSettlements(gymId?: string, status?: SettlementStatus) {
        const where: any = {};
        if (gymId) where.gymId = gymId;
        if (status) where.status = status;

        return prisma.settlement.findMany({
            where,
            include: {
                gym: { select: { name: true, owner: { select: { name: true, mobileNumber: true } } } },
                _count: { select: { payments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    // Get Single Settlement
    async getSettlementById(id: string) {
        return prisma.settlement.findUnique({
            where: { id },
            include: {
                gym: true,
                payments: {
                    include: {
                        subscription: {
                            include: {
                                user: true,
                                plan: true,
                            },
                        },
                    },
                },
            },
        });
    },

    // Process Settlement (Mark as Paid)
    async processSettlement(id: string, transactionId: string, notes?: string) {
        const settlement = await prisma.settlement.update({
            where: { id },
            data: {
                status: SettlementStatus.PROCESSED,
                transactionId,
                notes,
            },
            include: {
                gym: {
                    select: {
                        name: true,
                        ownerId: true,
                    },
                },
            },
        });

        // ✅ Event-based notification - Settlement Processed
        await notificationService.notifyUser(
            settlement.gym.ownerId,
            NotificationEvent.SETTLEMENT_PROCESSED,
            {
                amount: settlement.amount,
                gymName: settlement.gym.name,
                transactionId: settlement.transactionId || undefined
            }
        );

        return settlement;
    },
};

