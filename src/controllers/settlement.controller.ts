import { Request, Response } from 'express';
import { settlementService } from '../services';
import { SettlementStatus } from '@prisma/client';
import { auditLogService } from '../services/auditLog.service';
import { getAuthUser } from '../utils/getAuthUser';

import prisma from '../lib/prisma';

export const createSettlement = async (req: Request, res: Response) => {
    try {
        const { gymId } = req.body;
        const user = getAuthUser(req);

        // Only Admin can create settlements (initiate payout calculation)
        // Or maybe Owner requests it? Usually Admin runs it.
        // Assuming Admin for now based on "Admin will be setteling".

        if (!gymId) {
            return res.status(400).json({ message: 'gymId is required' });
        }

        const settlement = await settlementService.createSettlement(gymId);

        if (user) {
            await auditLogService.createAuditLog({
                action: 'SETTLEMENT_CREATED',
                details: `Created settlement for gym (ID: ${gymId}) with amount ${settlement.amount}`,
                userId: user.id,
                userName: user.name,
                gymId: gymId,
            });
        }

        return res.status(201).json({
            message: 'Settlement created successfully',
            data: settlement,
        });
    } catch (error: any) {
        console.error('Create settlement error:', error);
        return res.status(500).json({ message: error.message || 'Failed to create settlement' });
    }
};

export const getSettlements = async (req: Request, res: Response) => {
    try {
        const { gymId, status, startDate, endDate, page, limit } = req.query;
        const user = (req as any).user;
        const userRoles = user.roles || [];

        let filterGymId: string | string[] | undefined = gymId as string;

        if (userRoles.includes('ADMIN')) {
            // Admin can filter freely
        } else if (userRoles.includes('OWNER')) {
            // Owner Logic
            if (filterGymId) {
                // Verify ownership
                const gym = await prisma.gym.findUnique({
                    where: { id: filterGymId as string },
                    select: { ownerId: true }
                });

                if (!gym || gym.ownerId !== user.id) {
                    return res.status(403).json({ message: 'Not authorized for this gym' });
                }
            } else {
                // Fetch all owned gyms
                const myGyms = await prisma.gym.findMany({
                    where: { ownerId: user.id },
                    select: { id: true }
                });

                if (myGyms.length === 0) {
                    return res.status(200).json({
                        data: [],
                        meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
                    });
                }
                filterGymId = myGyms.map(g => g.id);
            }
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const result = await settlementService.getSettlements({
            gymId: filterGymId,
            status: status as SettlementStatus,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
            page: Number(page) || 1,
            limit: Number(limit) || 10,
        });

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('Get settlements error:', error);
        return res.status(500).json({ message: 'Failed to fetch settlements' });
    }
};

export const getSettlementById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const userRoles = user.roles || [];

        const settlement = await settlementService.getSettlementById(id);
        if (!settlement) {
            return res.status(404).json({ message: 'Settlement not found' });
        }

        // Auth check
        if (!userRoles.includes('ADMIN')) {
            if (settlement.gym.ownerId !== user.id) {
                return res.status(403).json({ message: 'Not authorized' });
            }
        }

        return res.status(200).json({ data: settlement });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch settlement' });
    }
}

export const processSettlement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { transactionId, notes } = req.body;
        const user = getAuthUser(req);

        // Only Admin can process
        // Middleware should handle role check, but double check here if needed.

        if (!transactionId) {
            return res.status(400).json({ message: 'transactionId is required' });
        }

        const updated = await settlementService.processSettlement(id, transactionId, notes);

        if (user) {
            await auditLogService.createAuditLog({
                action: 'SETTLEMENT_PROCESSED',
                details: `Processed settlement (ID: ${id}) with Transaction ID: ${transactionId}`,
                userId: user.id,
                userName: user.name,
                gymId: updated.gymId,
            });
        }

        return res.status(200).json({
            message: 'Settlement processed successfully',
            data: updated,
        });
    } catch (error: any) {
        return res.status(500).json({ message: 'Failed to process settlement' });
    }
};

export const getUnsettledAmount = async (req: Request, res: Response) => {
    try {
        const { gymId } = req.query;
        if (!gymId) return res.status(400).json({ message: 'gymId required' });

        const payments = await settlementService.getUnsettledPayments(gymId as string);
        const total = payments.reduce((sum, p) => sum + p.amount, 0);

        return res.status(200).json({
            data: {
                amount: total,
                count: payments.length,
                payments // Optional: return list
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch unsettled amount' });
    }
}
