import { PrismaClient, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const adminService = {
    async getDashboardStats() {
        const [
            totalUsers,
            totalGyms,
            totalRevenueResult,
            recentUsers,
            recentGyms
        ] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.gym.count(),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { status: PaymentStatus.COMPLETED }
            }),
            prisma.user.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, createdAt: true }
            }),
            prisma.gym.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, name: true, createdAt: true }
            })
        ]);

        // Combine and sort recent activity
        const recentActivity = [
            ...recentUsers.map(u => ({ type: 'USER_JOINED', title: u.name, time: u.createdAt })),
            ...recentGyms.map(g => ({ type: 'GYM_CREATED', title: g.name, time: g.createdAt }))
        ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);

        return {
            totalUsers,
            totalGyms,
            totalRevenue: totalRevenueResult._sum.amount || 0,
            recentActivity
        };
    }
};
