import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userCount = await prisma.user.count();
    if (userCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining user account.' }, { status: 400 });
    }

    // Delete assignments
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
