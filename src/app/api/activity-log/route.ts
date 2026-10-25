import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    if (!checkUserAction(caller, 'audit', 'view') && !caller.isSuperAdmin) {
      return forbiddenResponse('You do not have permission to view activity logs.');
    }

    const logs = await prisma.activityLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('API Error GET /api/activity-log:', error);
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
