import { Role } from '@prisma/client';
import { authorize } from './authorize';

export const isOwner = authorize([Role.OWNER]);