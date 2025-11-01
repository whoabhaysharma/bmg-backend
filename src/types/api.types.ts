import { Request } from 'express';
import { User, Role, UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: Role[];
  };
}

export interface UserWithRoles extends User {
  userRoles: UserRole[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}

export interface PaginatedResponse<T> extends ApiResponse {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
}