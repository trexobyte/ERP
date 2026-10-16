import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [], content: [], tasks: [], invoices: [] });
    }

    const [clients, content, tasks, invoices] = await Promise.all([
      prisma.client.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' as any } },
            { servicePackage: { contains: q, mode: 'insensitive' as any } },
            { packageTier: { contains: q, mode: 'insensitive' as any } },
          ],
        },
        take: 5,
        select: { id: true, name: true, color: true, servicePackage: true, status: true },
      }),
      prisma.contentItem.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' as any } },
            { description: { contains: q, mode: 'insensitive' as any } },
            { type: { contains: q, mode: 'insensitive' as any } },
            { platform: { contains: q, mode: 'insensitive' as any } },
          ],
        },
        take: 5,
        include: {
          client: { select: { name: true, color: true } },
        },
      }),
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' as any } },
            { description: { contains: q, mode: 'insensitive' as any } },
            { urgency: { contains: q, mode: 'insensitive' as any } },
          ],
        },
        take: 5,
        include: {
          client: { select: { name: true, color: true } },
        },
      }),
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' as any } },
            { billingPeriod: { contains: q, mode: 'insensitive' as any } },
          ],
        },
        take: 5,
        include: {
          client: { select: { name: true, color: true } },
        },
      }),
    ]);

    return NextResponse.json({ clients, content, tasks, invoices });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Failed to perform search' }, { status: 500 });
  }
}
