import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import {
  getAuthenticatedUser,
  checkUserAction,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }

    if (!checkUserAction(caller, 'users', 'delete')) {
      return forbiddenResponse('You do not have permission to delete team members.');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role?.name === 'Super Admin') {
      const superAdminCount = await prisma.user.count({
        where: { role: { name: 'Super Admin' }, active: true },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last remaining Super Admin account.' },
          { status: 400 }
        );
      }
    }

    const userCount = await prisma.user.count();
    if (userCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining user account.' }, { status: 400 });
    }

    // Delete assignments
    await prisma.clientAssignment.deleteMany({ where: { userId: id } });

    // Delete user
    await prisma.user.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: caller.id,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
        details: `Deleted team user account: ${user.name} (${user.email})`,
        previousState: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          roleId: user.roleId,
          active: user.active,
          permissions: user.permissions,
        }),
      },
    });

    await invalidateCache('users');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
