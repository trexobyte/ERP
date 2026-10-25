import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import {
  getAuthenticatedUser,
  checkUserAction,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!checkUserAction(caller, 'users', 'view')) {
      return forbiddenResponse('You do not have permission to view roles.');
    }

    const cacheKey = 'roles:all';
    const cached = await getCached<any[]>(cacheKey);
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

    await setCached(cacheKey, roles, 60);
    return NextResponse.json(roles);
  } catch (error) {
    console.error('API Error GET /api/roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!caller.isSuperAdmin) {
      return forbiddenResponse('Only Super Admins can create custom roles.');
    }

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

    await prisma.activityLog.create({
      data: {
        userId: caller.id,
        action: 'CREATE',
        entityType: 'Role',
        entityId: role.id,
        details: `Created custom role: ${role.name}`,
      },
    });

    await invalidateCache('roles');
    return NextResponse.json(role);
  } catch (error: any) {
    console.error('API Error POST /api/roles:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create role' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!caller.isSuperAdmin) {
      return forbiddenResponse('Only Super Admins can update roles.');
    }

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

    await invalidateCache('roles');
    return NextResponse.json(role);
  } catch (error: any) {
    console.error('API Error PUT /api/roles:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update role' }, { status: 500 });
  }
}
