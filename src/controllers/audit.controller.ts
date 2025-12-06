import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export const auditController = {
  // Get audit logs for a specific gym (Owner/Admin)
  async getGymAuditLogs(req: Request, res: Response) {
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

      const skip = (Number(page) - 1) * Number(limit);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { gymId },
          include: {
            actor: {
              select: { id: true, name: true, mobileNumber: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.auditLog.count({ where: { gymId } }),
      ]);

      res.json({
        data: logs,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        }
      });

    } catch (error) {
      console.error('Error fetching gym audit logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get all audit logs (Admin only)
  async getAllAuditLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, entity, action, gymId } = req.query;
      const user = (req as any).user;

      if (!user || user.role !== Role.ADMIN) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const where: any = {};
      if (entity) where.entity = String(entity);
      if (action) where.action = String(action);
      if (gymId) where.gymId = String(gymId);

      const skip = (Number(page) - 1) * Number(limit);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            actor: {
              select: { id: true, name: true, mobileNumber: true }
            },
            gym: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        data: logs,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        }
      });
    } catch (error) {
      console.error('Error fetching all audit logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Get my audit logs (User's own actions)
  async getMyAuditLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { actorId: user.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.auditLog.count({ where: { actorId: user.id } }),
      ]);

      res.json({
        data: logs,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        }
      });
    } catch (error) {
      console.error('Error fetching my audit logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};
