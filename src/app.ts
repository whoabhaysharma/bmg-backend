import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';

// Initialize Prisma Client
export const prisma = new PrismaClient();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
// TODO: Add routes here
// app.use('/api/auth', authRouter);
// app.use('/api/users', usersRouter);

// Error handling
app.use(errorHandler);

export default app;