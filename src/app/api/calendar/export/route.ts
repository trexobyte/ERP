import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateIcsCalendar, ShootCalendarEvent } from '@/lib/ics-generator';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year'); // e.g. 2026
    const singleItemId = searchParams.get('itemId');

    const where: any = {
      scheduledDate: { not: null },
    };

    if (singleItemId) {
      where.id = singleItemId;
    } else {
      where.type = 'SHOOT';
      if (clientId) {
        where.clientId = clientId;
      }

      if (month && year) {
        const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 1);
        where.scheduledDate = {
          gte: startDate,
          lt: endDate,
        };
      }
    }

    const items = await prisma.contentItem.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const events: ShootCalendarEvent[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      clientName: item.client?.name,
      clientColor: item.client?.color || '#FF3B00',
      scheduledDate: item.scheduledDate!,
      durationMinutes: 180,
      location: (item as any).location || 'Kathmandu, Nepal',
      assigneeName: item.assignee?.name,
      assigneeEmail: item.assignee?.email,
      status: item.status,
    }));

    const calendarName = clientId && items[0]?.client?.name
      ? `TrexoByte Shoots — ${items[0].client.name}`
      : 'TrexoByte Agency Shoots';

    const icsContent = generateIcsCalendar(events, calendarName);
    const filename = singleItemId
      ? `shoot-${items[0]?.title ? items[0].title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'session'}.ics`
      : 'trexobyte-shoots.ics';

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('API Error /api/calendar/export:', error);
    return NextResponse.json({ error: 'Failed to generate calendar export' }, { status: 500 });
  }
}
