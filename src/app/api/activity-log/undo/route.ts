import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unmarkClientDeleted } from '@/lib/deleted-clients';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

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
    } else if (log.entityType === 'User') {
      if (log.entityId && snapshot) {
        const updateData: any = {};
        if (snapshot.name !== undefined) updateData.name = snapshot.name;
        if (snapshot.email !== undefined) updateData.email = snapshot.email;
        if (snapshot.department !== undefined) updateData.department = snapshot.department;
        if (snapshot.roleId !== undefined) updateData.roleId = snapshot.roleId;
        if (snapshot.active !== undefined) updateData.active = snapshot.active;
        if (snapshot.permissions !== undefined) updateData.permissions = snapshot.permissions;

        await prisma.user.update({
          where: { id: log.entityId },
          data: updateData,
        });
        await invalidateCache('users');
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

    // Invalidate affected entity and dashboard caches
    if (log.entityType === 'Client') {
      await invalidateCache('clients');
    } else if (log.entityType === 'Task') {
      await invalidateCache('tasks');
    } else if (log.entityType === 'ContentItem') {
      await invalidateCache('content');
    } else if (log.entityType === 'User') {
      await invalidateCache('users');
    }
    await invalidateCache('dashboard');

    return NextResponse.json({ success: true, message: `Successfully undone: ${log.details}` });
  } catch (error: any) {
    console.error('API Error POST /api/activity-log/undo:', error);
    return NextResponse.json({ error: error?.message || 'Failed to undo changes' }, { status: 500 });
  }
}
