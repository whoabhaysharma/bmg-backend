import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const verifySecret = (req: Request, res: Response, next: NextFunction) => {
    // If already authenticated via API Auth (Admin/Owner), allow
    if ((req as any).user && (req as any).user.roles.includes('ADMIN')) {
        return next();
    }

    const secret = req.headers['x-whatsapp-secret'];

    if (!process.env.WHATSAPP_BACKEND_SECRET) {
        console.warn('WHATSAPP_BACKEND_SECRET is not set in environment variables.');
        // In development, we might want to allow this, but for security, let's block or warn
    }

    if (secret !== process.env.WHATSAPP_BACKEND_SECRET) {
        return sendError(res, 'Invalid or missing WhatsApp Secret', 403);
    }

    next();
};
