import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markClientDeleted } from '@/lib/deleted-clients';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        assignedTeam: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                department: true,
                role: {
                  select: { name: true },
                },
              },
            },
          },
        },
        contentItems: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { scheduledDate: 'desc' },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { dueDate: 'asc' },
        },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: { issueDate: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('API Error GET /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    const existingClient = await prisma.client.findUnique({
      where: { id },
      include: { assignedTeam: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, logo, color, servicePackage, packageTier, status, monthlyRetainer, startDate, billingCycleDay, assignedUserIds } = body;

    // First update assignments if provided
    if (assignedUserIds) {
      await prisma.clientAssignment.deleteMany({
        where: { clientId: id },
      });
      await prisma.clientAssignment.createMany({
        data: assignedUserIds.map((uId: string) => ({
          clientId: id,
          userId: uId,
        })),
      });
    }

    // Calculate field diffs for Activity History
    const diffs: { field: string; oldVal: string; newVal: string }[] = [];
    if (name && name.trim() !== existingClient.name) {
      diffs.push({ field: 'Client Name', oldVal: existingClient.name, newVal: name.trim() });
    }
    if (servicePackage && servicePackage !== existingClient.servicePackage) {
      diffs.push({ field: 'Service Package', oldVal: existingClient.servicePackage, newVal: servicePackage });
    }
    if (packageTier && packageTier !== existingClient.packageTier) {
      diffs.push({ field: 'Package Tier', oldVal: existingClient.packageTier, newVal: packageTier });
    }
    if (status && status !== existingClient.status) {
      diffs.push({ field: 'Account Status', oldVal: existingClient.status, newVal: status });
    }
    if (monthlyRetainer !== undefined && parseFloat(monthlyRetainer) !== existingClient.monthlyRetainer) {
      diffs.push({
        field: 'Monthly Retainer',
        oldVal: `NPR ${existingClient.monthlyRetainer.toLocaleString()}`,
        newVal: `NPR ${parseFloat(monthlyRetainer).toLocaleString()}`,
      });
    }
    if (billingCycleDay !== undefined && parseInt(billingCycleDay) !== existingClient.billingCycleDay) {
      diffs.push({ field: 'Billing Cycle Day', oldVal: `Day ${existingClient.billingCycleDay}`, newVal: `Day ${billingCycleDay}` });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(logo !== undefined && { logo }),
        ...(color && { color }),
        ...(servicePackage && { servicePackage }),
        ...(packageTier && { packageTier }),
        ...(status && { status }),
        ...(monthlyRetainer !== undefined && { monthlyRetainer: parseFloat(monthlyRetainer) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(billingCycleDay !== undefined && { billingCycleDay: parseInt(billingCycleDay) }),
      },
      include: {
        assignedTeam: {
          include: { user: true },
        },
      },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entityType: 'Client',
          entityId: id,
          details: `Updated client account: ${updated.name}`,
          changes: JSON.stringify(diffs),
          previousState: JSON.stringify(existingClient),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('API Error PUT /api/clients/[id]:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { assignedTeam: true },
    });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    markClientDeleted(id);

    // Try hard delete first to completely purge from DB; fall back to soft delete
    try {
      await prisma.client.delete({ where: { id } });
    } catch (e) {
      await prisma.client.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    // Record Activity Log
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          entityType: 'Client',
          entityId: id,
          details: `Deleted client account: ${client.name}`,
          changes: JSON.stringify([{ field: 'Account Status', oldVal: client.status, newVal: 'DELETED' }]),
          previousState: JSON.stringify(client),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/clients/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete client account' }, { status: 500 });
  }
}
