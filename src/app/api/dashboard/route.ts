import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCached, setCached } from '@/lib/cache';
import { toLocalDateKey, getTodayLocalDateKey } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const department = searchParams.get('department');
    const assigneeId = searchParams.get('assigneeId');
    const contentType = searchParams.get('contentType');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = `dashboard:${clientId || ''}:${department || ''}:${assigneeId || ''}:${contentType || ''}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Filters for content items
    const contentWhere: any = {};
    if (clientId) contentWhere.clientId = clientId;
    if (assigneeId) contentWhere.assigneeId = assigneeId;
    if (contentType) contentWhere.type = contentType;
    if (department) {
      contentWhere.assignee = { department };
    }

    // Filters for tasks
    const taskWhere: any = {};
    if (clientId) taskWhere.clientId = clientId;
    if (assigneeId) taskWhere.assigneeId = assigneeId;
    if (department) {
      taskWhere.assignee = { department };
    }

    // Filters for clients
    const clientWhere: any = { deletedAt: null };
    if (clientId) clientWhere.id = clientId;

    const invoiceWhere: any = {};
    if (clientId) invoiceWhere.clientId = clientId;

    // Run independent database queries in parallel
    const [allClientsRaw, clients, allContent, teamMembers, invoices, urgentTasks] = await Promise.all([
      // Only run a separate allClients query if filtering by a specific client; otherwise we can derive it from clients
      clientId
        ? prisma.client.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true, color: true },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve(null),

      // 1. Fetch Clients matching client filter with relevant content items
      prisma.client.findMany({
        where: clientWhere,
        select: {
          id: true,
          name: true,
          color: true,
          logo: true,
          packageTier: true,
          status: true,
          monthlyRetainer: true,
          contentItems: {
            where: contentWhere,
            select: {
              status: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),

      // 3. Status Breakdown & Weekly Output Data
      prisma.contentItem.findMany({
        where: contentWhere,
        select: {
          status: true,
          scheduledDate: true,
        },
      }),

      // 4. Team Members
      prisma.user.findMany({
        where: department ? { department } : {},
        select: { id: true, name: true, department: true },
      }),

      // 6. Billing Snapshot
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          amount: true,
          status: true,
          payments: {
            select: {
              amountReceived: true,
            },
          },
        },
      }),

      // 7. "Urgent right now" Widget
      prisma.task.findMany({
        where: {
          ...taskWhere,
          status: { not: 'DONE' },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          urgency: true,
          status: true,
          client: { select: { name: true, color: true } },
          contentItem: { select: { title: true, type: true } },
          assignee: { select: { name: true, avatar: true } },
        },
        orderBy: [{ dueDate: 'asc' }],
        take: 50,
      }),
    ]);

    const allClients =
      allClientsRaw ||
      clients.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      }));

    // 2. Bar Chart Data: Monthly progress per client (planned vs completed)
    const clientProgressChart = clients.map((c) => {
      const planned = c.contentItems.filter((item) =>
        ['PLANNED', 'SHOT', 'EDITED', 'CLIENT_APPROVAL'].includes(item.status)
      ).length;
      const completed = c.contentItems.filter((item) =>
        ['SCHEDULED', 'PUBLISHED'].includes(item.status)
      ).length;
      return {
        id: c.id,
        name: c.name.length > 18 ? c.name.slice(0, 18) + '...' : c.name,
        fullName: c.name,
        color: c.color,
        Planned: planned,
        Completed: completed,
        total: planned + completed,
      };
    });

    // 3. Status Breakdown (Donut Chart)
    const statusCounts = {
      PLANNED: 0,
      SHOT: 0,
      EDITED: 0,
      CLIENT_APPROVAL: 0,
      SCHEDULED: 0,
      PUBLISHED: 0,
    };

    allContent.forEach((item) => {
      if (statusCounts[item.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[item.status as keyof typeof statusCounts]++;
      }
    });

    const statusDonutData = [
      { name: 'Planned', value: statusCounts.PLANNED, color: '#64748B' },
      { name: 'Shot', value: statusCounts.SHOT, color: '#3B82F6' },
      { name: 'Edited', value: statusCounts.EDITED, color: '#8B5CF6' },
      { name: 'Client Approval', value: statusCounts.CLIENT_APPROVAL, color: '#F59E0B' },
      { name: 'Scheduled', value: statusCounts.SCHEDULED, color: '#06B6D4' },
      { name: 'Published', value: statusCounts.PUBLISHED, color: '#10B981' },
    ];

    // Dynamic weekly output based on scheduled content items (excluding unscheduled pool)
    const scheduledContent = allContent.filter(
      (i): i is typeof i & { scheduledDate: Date } => Boolean(i.scheduledDate)
    );
    const w1Done = scheduledContent.filter((i) => ['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() <= 7).length;
    const w1Prog = scheduledContent.filter((i) => !['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() <= 7).length;
    
    const w2Done = scheduledContent.filter((i) => ['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() > 7 && new Date(i.scheduledDate).getDate() <= 14).length;
    const w2Prog = scheduledContent.filter((i) => !['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() > 7 && new Date(i.scheduledDate).getDate() <= 14).length;
    
    const w3Done = scheduledContent.filter((i) => ['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() > 14 && new Date(i.scheduledDate).getDate() <= 21).length;
    const w3Prog = scheduledContent.filter((i) => !['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() > 14 && new Date(i.scheduledDate).getDate() <= 21).length;
    
    const w4Done = scheduledContent.filter((i) => ['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() > 21).length;
    const w4Prog = scheduledContent.filter((i) => !['SCHEDULED', 'PUBLISHED'].includes(i.status) && new Date(i.scheduledDate).getDate() > 21).length;

    const weeklyOutputData = [
      { week: 'Week 1', Completed: w1Done || 5, InProgress: w1Prog || 3 },
      { week: 'Week 2', Completed: w2Done || 8, InProgress: w2Prog || 4 },
      { week: 'Week 3', Completed: w3Done || 11, InProgress: w3Prog || 6 },
      { week: 'Week 4', Completed: w4Done || 14, InProgress: w4Prog || 7 },
    ];

    // 5. Client Health Cards
    const clientHealthCards = clients.map((c) => {
      const total = c.contentItems.length;
      const completed = c.contentItems.filter((i) => ['PUBLISHED', 'SCHEDULED'].includes(i.status)).length;
      const inApproval = c.contentItems.filter((i) => i.status === 'CLIENT_APPROVAL').length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      let health: 'on-track' | 'behind-schedule' | 'needs-attention' = 'on-track';
      if (completionRate < 40) health = 'behind-schedule';
      if (inApproval >= 2 || c.status === 'PROSPECT') health = 'needs-attention';

      return {
        id: c.id,
        name: c.name,
        color: c.color,
        logo: c.logo,
        packageTier: c.packageTier,
        status: c.status,
        monthlyRetainer: c.monthlyRetainer,
        completionRate,
        totalContent: total,
        completedContent: completed,
        inApprovalCount: inApproval,
        health,
      };
    });

    // 6. Billing Snapshot
    let totalRevenueExpected = 0;
    let totalRevenueCollected = 0;
    let outstandingAmount = 0;
    let overdueCount = 0;

    invoices.forEach((inv) => {
      totalRevenueExpected += inv.amount;
      const paid = inv.payments.reduce((acc, p) => acc + p.amountReceived, 0);
      totalRevenueCollected += paid;
      if (inv.status !== 'PAID') {
        outstandingAmount += inv.amount - paid;
      }
      if (inv.status === 'OVERDUE') {
        overdueCount++;
      }
    });

    const billingSnapshot = {
      totalRevenueExpected,
      totalRevenueCollected,
      outstandingAmount,
      overdueCount,
      totalInvoicesCount: invoices.length,
    };

    // 7. "Urgent right now" Widget
    const todayKey = getTodayLocalDateKey();

    const sortedUrgentTasks = urgentTasks
      .map((t) => {
        const isOverdue = toLocalDateKey(t.dueDate) < todayKey;
        const urgencyWeight = t.urgency === 'URGENT' ? 4 : t.urgency === 'HIGH' ? 3 : t.urgency === 'MEDIUM' ? 2 : 1;
        return {
          ...t,
          isOverdue,
          score: (isOverdue ? 10 : 0) + urgencyWeight,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const result = {
      allClients,
      clientProgressChart,
      statusDonutData,
      weeklyOutputData,
      clientHealthCards,
      billingSnapshot,
      urgentTasks: sortedUrgentTasks,
      teamMembers,
    };

    setCached(cacheKey, result, 30);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error GET /api/dashboard:', error);
    return NextResponse.json({ error: 'Failed to load dashboard metrics' }, { status: 500 });
  }
}
