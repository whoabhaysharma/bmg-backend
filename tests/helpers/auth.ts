import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../src/config/constants';
import { Role } from '@prisma/client';

export const generateTestToken = (userId: string, roles: Role[] = ['USER']) => {
    return jwt.sign(
        {
            userId,
            roles,
            email: 'test@example.com',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
};
