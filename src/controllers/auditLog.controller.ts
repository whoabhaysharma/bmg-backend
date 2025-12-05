import { RequestHandler } from 'express';
import { auditLogService } from '../services/auditLog.service';
import { sendSuccess, sendInternalError, sendForbidden } from '../utils/response';
import { getAuthUser } from '../utils/getAuthUser';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';

export const getAuditLogs: RequestHandler = async (req, res) => {
    try {
        const user = getAuthUser(req);
        if (!user) {
            return sendForbidden(res, 'Authentication required');
        }

        let gymIds: string[] | undefined;

        if (user.roles.includes(Role.ADMIN)) {
            // Admin sees all logs
            // Optionally, we could allow Admin to filter by gymId via query params here
        } else if (user.roles.includes(Role.OWNER)) {
            // Owner sees logs only for their gyms
            const ownedGyms = await prisma.gym.findMany({
                where: { ownerId: user.id },
                select: { id: true }
            });

            if (ownedGyms.length === 0) {
                return sendSuccess(res, []);
            }
            gymIds = ownedGyms.map(g => g.id);
        } else {
            return sendForbidden(res, 'Only admins and owners can view audit logs');
        }

        const logs = await auditLogService.getAuditLogs(50, gymIds);
        return sendSuccess(res, logs);
    } catch (error) {
        return sendInternalError(res, 'Failed to fetch audit logs');
    }
};
