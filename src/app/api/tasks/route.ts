import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const urgency = searchParams.get('urgency');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const department = searchParams.get('department');

    const cacheKey = `tasks:${clientId || ''}:${urgency || ''}:${status || ''}:${assigneeId || ''}:${department || ''}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (urgency) where.urgency = urgency;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (department) {
      where.assignee = {
        department: department,
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        contentItem: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
      ],
    });

    setCached(cacheKey, tasks, 30);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('API Error GET /api/tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
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
    const { title, description, clientId, contentItemId, assigneeId, dueDate, urgency, status } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        clientId: clientId || null,
        contentItemId: contentItemId || null,
        assigneeId: assigneeId || null,
        createdById: userId,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        urgency: urgency || 'MEDIUM',
        status: status || 'TO_DO',
      },
      include: {
        client: true,
        assignee: true,
        contentItem: true,
      },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'Task',
          entityId: task.id,
          details: `Created task: "${task.title}"`,
        },
      });
    }

    invalidateCache('tasks');
    invalidateCache('dashboard');
    return NextResponse.json(task);
  } catch (error: any) {
    console.error('API Error POST /api/tasks:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create task' }, { status: 500 });
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
    const { id, title, description, clientId, contentItemId, assigneeId, dueDate, urgency, status, updateContentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const isCompleting = status === 'DONE';

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(clientId !== undefined && { clientId }),
        ...(contentItemId !== undefined && { contentItemId }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(urgency && { urgency }),
        ...(status && {
          status,
          completedDate: isCompleting ? new Date() : null,
        }),
      },
      include: {
        client: true,
        assignee: true,
        contentItem: true,
      },
    });

    // If task was completed and requested updating linked ContentItem
    if (isCompleting && updateContentStatus && updatedTask.contentItemId) {
      await prisma.contentItem.update({
        where: { id: updatedTask.contentItemId },
        data: { status: updateContentStatus },
      });
      invalidateCache('content');
    }

    invalidateCache('tasks');
    invalidateCache('dashboard');
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('API Error PUT /api/tasks:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

    await prisma.task.delete({ where: { id } });
    invalidateCache('tasks');
    invalidateCache('dashboard');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error DELETE /api/tasks:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
