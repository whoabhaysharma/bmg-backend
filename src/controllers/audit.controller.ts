import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { auditService } from '@services';
import prisma from '../lib/prisma'; // Still needed for gym verification

// Get audit logs for a specific gym (Owner/Admin)
export const getGymAuditLogs = async (req: Request, res: Response) => {
  try {
    const { gymId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const user = (req as any).user; // Set by isAuthenticated middleware

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Authorization check
    if (user.role !== Role.ADMIN) {
      // If not admin, must be owner of the gym
      const gym = await prisma.gym.findUnique({
        where: { id: gymId },
        select: { ownerId: true }
      });

      if (!gym || gym.ownerId !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const result = await auditService.getGymAuditLogs(gymId, Number(page), Number(limit));
    res.json(result);

  } catch (error) {
    console.error('Error fetching gym audit logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all audit logs (Admin only)
export const getAllAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, entity, action, gymId } = req.query;
    const user = (req as any).user;

    if (!user || user.role !== Role.ADMIN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await auditService.getAllAuditLogs({
      entity: entity as string,
      action: action as string,
      gymId: gymId as string,
      page: Number(page),
      limit: Number(limit)
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get my audit logs (User's own actions)
export const getMyAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await auditService.getMyAuditLogs(user.id, Number(page), Number(limit));
    res.json(result);
  } catch (error) {
    console.error('Error fetching my audit logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
