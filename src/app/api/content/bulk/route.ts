import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    const body = await req.json();
    const { clientId, items } = body;

    if (!clientId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const createdItems = await prisma.$transaction(
      items.map((item: any) => {
        const rawDate = item.scheduledDate;
        const dateObj = rawDate
          ? new Date(rawDate.includes('T') ? rawDate : rawDate + 'T12:00:00')
          : new Date();

        return prisma.contentItem.create({
          data: {
            clientId,
            type: item.type || 'STATIC_POST',
            title: item.title,
            description: item.description || null,
            platform: item.platform || 'INSTAGRAM',
            scheduledDate: dateObj,
            status: item.status || 'PLANNED',
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

    return NextResponse.json(createdItems);
  } catch (error: any) {
    console.error('API Error POST /api/content/bulk:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk create content items' }, { status: 500 });
  }
}
