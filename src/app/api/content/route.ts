import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const type = searchParams.get('type');
    const myItemsOnly = searchParams.get('myItemsOnly') === 'true';

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const cacheKey = `content:${clientId || ''}:${status || ''}:${assigneeId || ''}:${type || ''}:${myItemsOnly ? userId : ''}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (assigneeId) where.assigneeId = assigneeId;
    if (myItemsOnly && userId) where.assigneeId = userId;

    // Privacy filter: shared items visible to everyone; personal items only visible to their assignee/owner
    where.OR = [
      { isPersonal: false },
      ...(userId ? [{ isPersonal: true, assigneeId: userId }] : []),
    ];

    let items;
    try {
      items = await prisma.contentItem.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              color: true,
              logo: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              department: true,
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
      });
    } catch (dbErr) {
      console.warn('First attempt failed, retrying content query in 250ms...', dbErr);
      await new Promise((resolve) => setTimeout(resolve, 250));
      items = await prisma.contentItem.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              color: true,
              logo: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
              department: true,
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
      });
    }

    if (Array.isArray(items) && items.length > 0) {
      setCached(cacheKey, items, 30);
    }
    return NextResponse.json(items);
  } catch (error) {
    console.error('API Error GET /api/content:', error);
    return NextResponse.json({ error: 'Failed to fetch content items' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const body = await req.json();
    const { clientId, isPersonal, type, title, description, platform, scheduledDate, status, assigneeId, clientFeedbackNotes, approvalOutcome, attachments } = body;

    const finalIsPersonal = Boolean(isPersonal);
    const finalAssigneeId = finalIsPersonal ? (assigneeId || userId || null) : (assigneeId || null);
    const finalClientId = finalIsPersonal ? (clientId || null) : (clientId || null);

    const item = await prisma.contentItem.create({
      data: {
        clientId: finalClientId,
        isPersonal: finalIsPersonal,
        type: type || (finalIsPersonal ? 'PERSONAL' : 'REEL'),
        title,
        description: description || null,
        platform: platform || (finalIsPersonal ? 'PERSONAL' : 'INSTAGRAM'),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        status: status || 'PLANNED',
        assigneeId: finalAssigneeId,
        clientFeedbackNotes: clientFeedbackNotes || null,
        approvalOutcome: approvalOutcome || null,
        attachments: attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null,
      },
      include: {
        client: true,
        assignee: true,
      },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'ContentItem',
          entityId: item.id,
          details: finalIsPersonal
            ? `Created personal calendar item: "${item.title}"`
            : `Created ${item.type}: "${item.title}" for ${item.client?.name || 'Client'}`,
        },
      });
    }

    invalidateCache('content');
    invalidateCache('tasks');
    invalidateCache('dashboard');
    return NextResponse.json(item);
  } catch (error) {
    console.error('API Error POST /api/content:', error);
    return NextResponse.json({ error: 'Failed to create content item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const body = await req.json();
    const { id, clientId, isPersonal, type, title, description, platform, scheduledDate, status, assigneeId, clientFeedbackNotes, approvalOutcome, attachments } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = await prisma.contentItem.findUnique({ where: { id }, include: { client: true } });

    const updated = await prisma.contentItem.update({
      where: { id },
      data: {
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(isPersonal !== undefined && { isPersonal }),
        ...(type && { type }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(platform && { platform }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
        ...(status && { status }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(clientFeedbackNotes !== undefined && { clientFeedbackNotes }),
        ...(approvalOutcome !== undefined && { approvalOutcome }),
        ...(attachments !== undefined && { attachments: typeof attachments === 'string' ? attachments : JSON.stringify(attachments) }),
      },
      include: {
        client: true,
        assignee: true,
      },
    });

    const isApprovalChange = approvalOutcome !== undefined && approvalOutcome !== existing?.approvalOutcome;
    const isStatusChange = status !== undefined && status !== existing?.status;

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: isApprovalChange ? 'APPROVAL' : isStatusChange ? 'STATUS_CHANGE' : 'UPDATE',
          entityType: 'ContentItem',
          entityId: updated.id,
          details: isApprovalChange
            ? `Logged approval outcome [${approvalOutcome}] for "${updated.title}"`
            : `Updated content item "${updated.title}" (${updated.status})`,
        },
      });
    }

    invalidateCache('content');
    invalidateCache('tasks');
    invalidateCache('dashboard');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('API Error PUT /api/content:', error);
    return NextResponse.json({ error: 'Failed to update content item' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.contentItem.delete({ where: { id } });
    invalidateCache('content');
    invalidateCache('tasks');
    invalidateCache('dashboard');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error DELETE /api/content:', error);
    return NextResponse.json({ error: 'Failed to delete content item' }, { status: 500 });
  }
}
