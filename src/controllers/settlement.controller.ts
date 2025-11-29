import { Request, Response } from 'express';
import { settlementService } from '../services';
import { SettlementStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSettlement = async (req: Request, res: Response) => {
    try {
        const { gymId } = req.body;

        // Only Admin can create settlements (initiate payout calculation)
        // Or maybe Owner requests it? Usually Admin runs it.
        // Assuming Admin for now based on "Admin will be setteling".

        if (!gymId) {
            return res.status(400).json({ message: 'gymId is required' });
        }

        const settlement = await settlementService.createSettlement(gymId);

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
        const { gymId, status } = req.query;
        const user = (req as any).user;
        const userRoles = user.roles || [];

        // Authorization
        // Admin can see all. Owner can see their own gyms.

        let targetGymId = gymId as string | undefined;

        if (userRoles.includes('ADMIN')) {
            // Admin can filter by gymId or see all
        } else if (userRoles.includes('OWNER')) {
            // Owner can only see their own gyms
            // If gymId is provided, verify ownership
            if (targetGymId) {
                const gym = await prisma.gym.findUnique({ where: { id: targetGymId }, select: { ownerId: true } });
                if (!gym || gym.ownerId !== user.id) {
                    return res.status(403).json({ message: 'Not authorized for this gym' });
                }
            } else {
                // If no gymId, we ideally should fetch all gyms owned by user and filter
                // But service.getSettlements takes optional gymId.
                // For now, let's enforce gymId for Owners or fetch their gyms.
                // Simpler: Fetch all gyms owned by user, then get settlements for those.
                // Or just let them pass gymId.
                if (!targetGymId) {
                    // If owner doesn't pass gymId, maybe return error or handle differently?
                    // Let's allow fetching all settlements for gyms owned by this user.
                    // This requires service update or complex query.
                    // For simplicity, let's require gymId for Owner for now, or handle in service.
                    // Actually, let's just fetch gyms owned by user.
                    const myGyms = await prisma.gym.findMany({ where: { ownerId: user.id }, select: { id: true } });
                    const myGymIds = myGyms.map(g => g.id);
                    // We need to filter settlements where gymId IN myGymIds.
                    // Service `getSettlements` currently takes single gymId.
                    // Let's just update service later if needed. For now, if Owner and no gymId, return error or empty?
                    // Let's return error "gymId required for Owner view" or similar if we want to keep it simple.
                    // OR, we can just let the service handle it if we pass a list? No, service takes string.
                    // Let's stick to: If Owner, must provide gymId.
                    return res.status(400).json({ message: 'gymId is required for Owners' });
                }
            }
        } else {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const settlements = await settlementService.getSettlements(targetGymId, status as SettlementStatus);
        return res.status(200).json({ data: settlements });

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

        // Only Admin can process
        // Middleware should handle role check, but double check here if needed.

        if (!transactionId) {
            return res.status(400).json({ message: 'transactionId is required' });
        }

        const updated = await settlementService.processSettlement(id, transactionId, notes);

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
