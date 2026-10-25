import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePermissions } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: 'User account inactive or not found' }, { status: 401 });
    }

    const permissions = user.permissions || user.role?.permissions || '{}';

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      avatar: user.avatar && !user.avatar.startsWith('data:') ? user.avatar : `/api/users/${user.id}/avatar`,
      roleId: user.roleId,
      roleName: user.role?.name || 'Viewer',
      permissions: typeof permissions === 'string' ? parsePermissions(permissions) : permissions,
      assignedClientIds: user.assignedClients.map((a) => a.clientId),
    });
  } catch (error: any) {
    console.error('API Error GET /api/users/me:', error);
    return NextResponse.json({ error: 'Failed to retrieve current user profile' }, { status: 500 });
  }
}
