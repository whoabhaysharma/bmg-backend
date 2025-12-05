import { Request, Response } from 'express';
import { adminService } from '../services';
import { sendSuccess, sendInternalError } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const stats = await adminService.getDashboardStats();
        return sendSuccess(res, stats);
    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        return sendInternalError(res, 'Failed to fetch dashboard stats');
    }
};
