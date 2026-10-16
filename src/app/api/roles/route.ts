import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = 'roles:all';
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const roles = await prisma.role.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    setCached(cacheKey, roles, 60);
    return NextResponse.json(roles);
  } catch (error) {
    console.error('API Error GET /api/roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
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
    const { name, permissions, isCustom } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        isCustom: isCustom !== undefined ? isCustom : true,
        permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions || {}),
      },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'Role',
          entityId: role.id,
          details: `Created custom role: ${role.name}`,
        },
      });
    }

    invalidateCache('roles');
    return NextResponse.json(role);
  } catch (error: any) {
    console.error('API Error POST /api/roles:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create role' }, { status: 500 });
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
    const { id, name, permissions } = body;

    if (!id) return NextResponse.json({ error: 'Role ID required' }, { status: 400 });

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(permissions !== undefined && {
          permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions),
        }),
      },
    });

    invalidateCache('roles');
    return NextResponse.json(role);
  } catch (error: any) {
    console.error('API Error PUT /api/roles:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update role' }, { status: 500 });
  }
}
