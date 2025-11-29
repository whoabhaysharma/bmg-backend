// Mock Prisma
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  auth: {
    verifyIdToken: jest.fn(),
  },
  default: {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
  },
}));

// Mock Logger
jest.mock('../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  jest.clearAllMocks();
});
