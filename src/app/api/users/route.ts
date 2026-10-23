import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { isDevPasswordFallbackAllowed } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = 'users:all';
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const users = await prisma.user.findMany({
      include: {
        role: true,
        assignedClients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Mask passwords
    const safeUsers = users.map((u) => {
      const { password, ...rest } = u;
      return rest;
    });

    await setCached(cacheKey, safeUsers, 30);
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('API Error GET /api/users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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
    const { name, email, password, department, roleId, avatar, active, assignedClientIds } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and Email are required fields' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const defaultPass = isDevPasswordFallbackAllowed() ? 'password123' : Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(password || defaultPass, 10);

    let finalRoleId = roleId || null;
    if (!finalRoleId) {
      const defaultRole = (await prisma.role.findFirst({ where: { name: 'Social Media Manager' } })) || (await prisma.role.findFirst());
      finalRoleId = defaultRole?.id || null;
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        department: department || 'Social Media',
        roleId: finalRoleId,
        avatar: avatar || null,
        active: active !== undefined ? active : true,
        assignedClients: {
          create: (assignedClientIds || []).map((cId: string) => ({
            clientId: cId,
          })),
        },
      },
      include: {
        role: true,
        assignedClients: { include: { client: true } },
      },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'User',
          entityId: newUser.id,
          details: `Created new team user account: ${newUser.name} (${newUser.email})`,
        },
      });
    }

    await invalidateCache('users');
    const { password: _, ...safeUser } = newUser;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('API Error POST /api/users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 });
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
    const { id, name, email, password, department, roleId, avatar, active, assignedClientIds } = body;

    const targetUserId = id || userId;
    if (!targetUserId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    if (assignedClientIds) {
      await prisma.clientAssignment.deleteMany({ where: { userId: targetUserId } });
      await prisma.clientAssignment.createMany({
        data: assignedClientIds.map((cId: string) => ({
          userId: targetUserId,
          clientId: cId,
        })),
      });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (department) updateData.department = department;
    if (roleId) updateData.roleId = roleId;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (active !== undefined) updateData.active = active;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      include: {
        role: true,
        assignedClients: { include: { client: true } },
      },
    });

    await invalidateCache('users');
    const { password: _, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error('API Error PUT /api/users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userCount = await prisma.user.count();
    if (userCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining user account.' }, { status: 400 });
    }

    // Delete assignments first
    await prisma.clientAssignment.deleteMany({ where: { userId: id } });

    // Delete user
    await prisma.user.delete({ where: { id } });

    if (userId && userId !== id) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          entityType: 'User',
          entityId: id,
          details: `Deleted team user account: ${user.name} (${user.email})`,
        },
      });
    }

    await invalidateCache('users');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
