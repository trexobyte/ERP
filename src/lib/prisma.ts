import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function sanitizeDbUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }

  const protocolIdx = url.indexOf('://');
  if (protocolIdx !== -1) {
    const afterProtocol = url.slice(protocolIdx + 3);
    const lastAtIdx = afterProtocol.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const authPart = afterProtocol.slice(0, lastAtIdx);
      const hostPart = afterProtocol.slice(lastAtIdx + 1);
      const firstColonIdx = authPart.indexOf(':');
      if (firstColonIdx !== -1) {
        const username = authPart.slice(0, firstColonIdx);
        let password = authPart.slice(firstColonIdx + 1);

        if (password.startsWith('[') && password.endsWith(']')) {
          password = password.slice(1, -1);
        }

        try {
          const decoded = decodeURIComponent(password);
          password = encodeURIComponent(decoded);
        } catch {
          password = encodeURIComponent(password);
        }

        url = `${url.slice(0, protocolIdx + 3)}${username}:${password}@${hostPart}`;
      }
    }
  }

  if (url.includes('pgbouncer=true') && !url.includes('connection_limit')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}connection_limit=1`;
  }

  return url;
}

// Prefer DATABASE_URL first on serverless (Vercel), fallback to DIRECT_URL
const rawUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const dbUrl = sanitizeDbUrl(rawUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

globalForPrisma.prisma = prisma;


