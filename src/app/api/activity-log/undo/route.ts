import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unmarkClientDeleted } from '@/lib/deleted-clients';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    const body = await req.json();
    const { logId } = body;

    if (!logId) {
      return NextResponse.json({ error: 'Activity Log ID is required' }, { status: 400 });
    }

    const log = await prisma.activityLog.findUnique({ where: { id: logId } });
    if (!log) {
      return NextResponse.json({ error: 'Activity log record not found' }, { status: 404 });
    }

    if (!log.previousState) {
      return NextResponse.json({ error: 'No undo snapshot available for this activity' }, { status: 400 });
    }

    const snapshot = JSON.parse(log.previousState);
    let actionType = 'RESTORE';

    // UNDO / RESTORE: Client Update or Delete
    if (log.entityType === 'Client') {
      const clientId = log.entityId || snapshot.id;

      if (log.action === 'UPDATE') {
        actionType = 'UNDO';
        const { name, logo, color, servicePackage, packageTier, status, monthlyRetainer, billingCycleDay } = snapshot;
        await prisma.client.update({
          where: { id: clientId },
          data: {
            name,
            logo,
            color,
            servicePackage,
            packageTier,
            status,
            monthlyRetainer,
            billingCycleDay,
          },
        });
      } else if (log.action === 'DELETE') {
        actionType = 'RESTORE';
        // Restore soft-deleted client
        await prisma.client.update({
          where: { id: clientId },
          data: { deletedAt: null },
        }).catch(async () => {
          // Fallback: re-create client if record was hard-deleted
          const { id, name, logo, color, servicePackage, packageTier, status, monthlyRetainer, billingCycleDay, startDate } = snapshot;
          await prisma.client.create({
            data: {
              id,
              name,
              logo: logo || null,
              color: color || '#FF3B00',
              servicePackage: servicePackage || 'Social & Growth',
              packageTier: packageTier || 'Standard',
              status: status || 'ACTIVE',
              monthlyRetainer: monthlyRetainer || 0,
              billingCycleDay: billingCycleDay || 1,
              startDate: startDate ? new Date(startDate) : new Date(),
              deletedAt: null,
            },
          });
        });

        unmarkClientDeleted(clientId);
      }
    } else if (log.entityType === 'Task') {
      if (log.entityId && snapshot) {
        await prisma.task.update({
          where: { id: log.entityId },
          data: {
            status: snapshot.status,
            title: snapshot.title,
            urgency: snapshot.urgency,
          },
        });
      }
    } else if (log.entityType === 'ContentItem') {
      if (log.entityId && snapshot) {
        await prisma.contentItem.update({
          where: { id: log.entityId },
          data: {
            status: snapshot.status,
            title: snapshot.title,
          },
        });
      }
    }

    // Record UNDO log
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'UNDO',
        entityType: log.entityType,
        entityId: log.entityId,
        details: `Undid previous action: "${log.details}"`,
      },
    });

    return NextResponse.json({ success: true, message: `Successfully undone: ${log.details}` });
  } catch (error: any) {
    console.error('API Error POST /api/activity-log/undo:', error);
    return NextResponse.json({ error: error?.message || 'Failed to undo changes' }, { status: 500 });
  }
}
