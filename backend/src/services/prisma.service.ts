import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

let prisma: PrismaClient;

declare global {
  var __prismaClient: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prismaClient) {
    global.__prismaClient = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.__prismaClient;
}

export async function connectPrisma() {
  try {
    await prisma.$connect();
    logger.info('Database connection established via Prisma');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database via Prisma:', error);
    return false;
  }
}

export { prisma };

