import prisma from '../lib/prisma';

export const createAuditLog = async (data: {
    action: string;
    details: string;
    userId: string;
    userName: string;
    gymId?: string;
}) => {
    return prisma.auditLog.create({
        data,
    });
};

export const getAuditLogs = async (limit = 50, gymIds?: string[]) => {
    const where: any = {};
    if (gymIds && gymIds.length > 0) {
        where.gymId = { in: gymIds };
    }

    return prisma.auditLog.findMany({
        where,
        take: limit,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const auditLogService = {
    createAuditLog,
    getAuditLogs,
};
