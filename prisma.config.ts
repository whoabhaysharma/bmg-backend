import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicitly load .env from the root directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Log the loaded DATABASE_URL for verification
console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL);

// Create Prisma Client instance
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Export the client instance
export default prisma;
