import { Request } from 'express';
import { User, Role, UserRole, Payment } from '@prisma/client';

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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
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

export interface ProcessPaymentRequest {
  method: string;
}

export interface ProcessPaymentResponse extends ApiResponse<Payment> {}

export interface PaymentHistoryResponse extends ApiResponse<Payment[]> {
  data: (Payment & {
    subscription: {
      gym: {
        id: string;
        name: string;
      };
      plan: {
        id: string;
        name: string;
        price: number;
      };
    };
  })[];
}

export interface GymPaymentHistoryResponse extends ApiResponse<Payment[]> {
  data: (Payment & {
    subscription: {
      user: {
        id: string;
        name: string;
        email: string;
      };
      plan: {
        id: string;
        name: string;
        price: number;
      };
    };
  })[];
}
