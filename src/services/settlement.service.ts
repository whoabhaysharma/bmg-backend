import { PrismaClient, SettlementStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
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
                },
                razorpayPaymentId: { gt: '' }, // Only Online payments (Not null and not empty)
                method: { not: PaymentMethod.CONSOLE }, // Double check to exclude Console payments
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

    // Get Unsettled Summary (Aggregated by Gym)
    async getUnsettledSummary() {
        // 1. Find all unsettled payments
        const payments = await prisma.payment.findMany({
            where: {
                razorpayPaymentId: { gt: '' }, // Only Online payments
                method: { not: PaymentMethod.CONSOLE },
                status: PaymentStatus.COMPLETED,
                settlementId: null,
            },
            include: {
                subscription: {
                    include: {
                        gym: {
                            include: {
                                owner: { select: { name: true, mobileNumber: true } }
                            }
                        }
                    }
                }
            }
        });

        // 2. Aggregate by Gym
        const summaryMap = new Map<string, {
            gymId: string;
            gymName: string;
            ownerName: string;
            amount: number;
            count: number;
        }>();

        for (const payment of payments) {
            const gym = payment.subscription.gym;
            const existing = summaryMap.get(gym.id);

            if (existing) {
                existing.amount += payment.amount;
                existing.count += 1;
            } else {
                summaryMap.set(gym.id, {
                    gymId: gym.id,
                    gymName: gym.name,
                    ownerName: gym.owner.name,
                    amount: payment.amount,
                    count: 1
                });
            }
        }

        return Array.from(summaryMap.values());
    },

    // Create Settlement (Admin action)
    async createSettlement(gymId: string) {
        return prisma.$transaction(async (tx) => {
            // 1. Find unsettled payments
            const unsettledPayments = await tx.payment.findMany({
                where: {
                    subscription: {
                        gymId,
                    },
                    razorpayPaymentId: { gt: '' }, // Only Online payments
                    method: { not: PaymentMethod.CONSOLE },
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
            notificationService.notifyUser(
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
    async getSettlements(filters: {
        gymId?: string | string[];
        status?: SettlementStatus;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    } = {}) {
        const { gymId, status, startDate, endDate, page = 1, limit = 10 } = filters;
        const skip = (page - 1) * limit;
        const where: any = {};

        if (gymId) {
            if (Array.isArray(gymId)) {
                where.gymId = { in: gymId };
            } else {
                where.gymId = gymId;
            }
        }

        if (status) where.status = status;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [settlements, total] = await Promise.all([
            prisma.settlement.findMany({
                where,
                include: {
                    gym: { select: { name: true, owner: { select: { name: true, mobileNumber: true } } } },
                    _count: { select: { payments: true } },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.settlement.count({ where }),
        ]);

        return {
            data: settlements,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
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
        notificationService.notifyUser(
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

