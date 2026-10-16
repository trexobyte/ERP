import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// On Vercel / AWS Lambda serverless functions, root filesystem is read-only.
// Copy SQLite database to /tmp if running in serverless / production environments.
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('/tmp'))) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const srcDb = path.join(process.cwd(), 'prisma', 'dev.db');
    if (fs.existsSync(srcDb)) {
      try {
        fs.copyFileSync(srcDb, tmpDbPath);
      } catch (e) {
        console.error('Failed to copy SQLite database to /tmp:', e);
      }
    }
  }
  if (fs.existsSync(tmpDbPath)) {
    process.env.DATABASE_URL = `file:${tmpDbPath}`;
  }
}

if (!process.env.DATABASE_URL) {
  const dbPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${dbPath}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

