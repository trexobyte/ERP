import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { toDatabaseDateString } from '@/lib/date-utils';

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
    const cached = await getCached<any[]>(cacheKey);
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
      await setCached(cacheKey, items, 30);
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

    let finalScheduledDate: Date | null = null;
    let finalStatus = status || 'PLANNED';

    if (scheduledDate) {
      const dbDateStr = toDatabaseDateString(scheduledDate);
      if (dbDateStr) {
        finalScheduledDate = new Date(dbDateStr);
        if (!status || status === 'PLANNED') {
          finalStatus = 'SCHEDULED';
        }
      }
    } else {
      finalScheduledDate = null;
      finalStatus = status || 'PLANNED';
    }

    const item = await prisma.contentItem.create({
      data: {
        clientId: finalClientId,
        isPersonal: finalIsPersonal,
        type: type || (finalIsPersonal ? 'PERSONAL' : 'REEL'),
        title,
        description: description || null,
        platform: platform || (finalIsPersonal ? 'PERSONAL' : 'INSTAGRAM'),
        scheduledDate: finalScheduledDate,
        status: finalStatus,
        assigneeId: finalAssigneeId,
        clientFeedbackNotes: clientFeedbackNotes || null,
        approvalOutcome: approvalOutcome || null,
        attachments: attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null,
      },
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

    await invalidateCache('content');
    await invalidateCache('tasks');
    await invalidateCache('dashboard');
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
    if (!existing) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (isPersonal !== undefined) updateData.isPersonal = isPersonal;
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (platform !== undefined) updateData.platform = platform;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (clientFeedbackNotes !== undefined) updateData.clientFeedbackNotes = clientFeedbackNotes;
    if (approvalOutcome !== undefined) updateData.approvalOutcome = approvalOutcome;
    if (attachments !== undefined) updateData.attachments = typeof attachments === 'string' ? attachments : JSON.stringify(attachments);

    if (status !== undefined) {
      updateData.status = status;
    }

    if ('scheduledDate' in body) {
      if (scheduledDate === null || scheduledDate === '' || scheduledDate === undefined) {
        updateData.scheduledDate = null;
        if (status === undefined) {
          updateData.status = 'PLANNED';
        }
      } else {
        const dbDateStr = toDatabaseDateString(scheduledDate);
        if (dbDateStr) {
          updateData.scheduledDate = new Date(dbDateStr);
          const currentStatus = status !== undefined ? status : existing.status;
          if (currentStatus === 'PLANNED') {
            updateData.status = 'SCHEDULED';
          }
        } else {
          updateData.scheduledDate = null;
          if (status === undefined) {
            updateData.status = 'PLANNED';
          }
        }
      }
    }

    const updated = await prisma.contentItem.update({
      where: { id },
      data: updateData,
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

    await invalidateCache('content');
    await invalidateCache('tasks');
    await invalidateCache('dashboard');
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
    await invalidateCache('content');
    await invalidateCache('tasks');
    await invalidateCache('dashboard');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error DELETE /api/content:', error);
    return NextResponse.json({ error: 'Failed to delete content item' }, { status: 500 });
  }
}
