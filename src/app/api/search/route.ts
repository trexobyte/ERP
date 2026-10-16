import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
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
            { name: { contains: q } },
            { servicePackage: { contains: q } },
            { packageTier: { contains: q } },
          ],
        },
        take: 5,
        select: { id: true, name: true, color: true, servicePackage: true, status: true },
      }),
      prisma.contentItem.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { type: { contains: q } },
            { platform: { contains: q } },
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
            { title: { contains: q } },
            { description: { contains: q } },
            { urgency: { contains: q } },
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
            { invoiceNumber: { contains: q } },
            { billingPeriod: { contains: q } },
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
