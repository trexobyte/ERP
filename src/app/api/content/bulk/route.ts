import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';
import { toDatabaseDateString } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const body = await req.json();
    const { clientId, items } = body;

    if (!clientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const createdItems = await prisma.$transaction(
      items.map((item: any) => {
        const dbDate = item.scheduledDate ? toDatabaseDateString(item.scheduledDate) : null;
        const dateObj = dbDate ? new Date(dbDate) : null;
        const finalStatus = item.status || (dateObj ? 'SCHEDULED' : 'PLANNED');

        return prisma.contentItem.create({
          data: {
            clientId,
            type: item.type || 'STATIC_POST',
            title: item.title,
            description: item.description || null,
            platform: item.platform || 'INSTAGRAM',
            scheduledDate: dateObj,
            status: finalStatus,
            assigneeId: item.assigneeId || null,
          },
          include: {
            client: true,
            assignee: true,
          },
        });
      })
    );

    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'ContentItem',
          entityId: clientId,
          details: `Planning Wizard: Created ${createdItems.length} content items for ${client?.name || 'Client'}`,
        },
      });
    }

    await invalidateCache('content');
    await invalidateCache('tasks');
    await invalidateCache('dashboard');
    return NextResponse.json(createdItems);
  } catch (error: any) {
    console.error('API Error POST /api/content/bulk:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk create content items' }, { status: 500 });
  }
}
