import { Role } from '@prisma/client';
import { authorize } from './authorize';

export const isAdmin = authorize([Role.ADMIN]);