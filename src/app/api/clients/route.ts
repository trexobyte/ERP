import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isClientDeleted } from '@/lib/deleted-clients';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = 'clients:all';
    const cached = getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let clients;
    try {
      clients = await prisma.client.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          assignedTeam: {
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
          },
          contentItems: {
            select: {
              id: true,
              status: true,
            },
          },
          invoices: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (dbErr) {
      console.warn('First attempt failed, retrying clients query in 250ms...', dbErr);
      await new Promise((resolve) => setTimeout(resolve, 250));
      clients = await prisma.client.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          assignedTeam: {
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
          },
          contentItems: {
            select: {
              id: true,
              status: true,
            },
          },
          invoices: {
            select: {
              id: true,
              amount: true,
              status: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    if (Array.isArray(clients) && clients.length > 0) {
      setCached(cacheKey, clients, 30);
    }
    return NextResponse.json(clients);
  } catch (error) {
    console.error('API Error /api/clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
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
    const { name, logo, color, servicePackage, packageTier, status, monthlyRetainer, startDate, billingCycleDay, assignedUserIds } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Client business name is required' }, { status: 400 });
    }

    const parsedRetainer = typeof monthlyRetainer === 'number'
      ? monthlyRetainer
      : parseFloat(String(monthlyRetainer || '0').replace(/[^0-9.]/g, '')) || 0;

    const parsedCycleDay = typeof billingCycleDay === 'number'
      ? billingCycleDay
      : parseInt(String(billingCycleDay || '1').replace(/[^0-9]/g, ''), 10) || 1;

    const newClient = await prisma.client.create({
      data: {
        name: name.trim(),
        logo: logo || null,
        color: color || '#FF3B00',
        servicePackage: servicePackage || 'Social & Growth',
        packageTier: packageTier || 'Standard',
        status: status || 'ACTIVE',
        monthlyRetainer: parsedRetainer,
        startDate: startDate ? new Date(startDate) : new Date(),
        billingCycleDay: Math.max(1, Math.min(31, parsedCycleDay)),
        assignedTeam: {
          create: (assignedUserIds || []).map((userId: string) => ({
            userId,
          })),
        },
      },
      include: {
        assignedTeam: {
          include: {
            user: true,
          },
        },
      },
    });

    // Activity log
    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'Client',
          entityId: newClient.id,
          details: `Created new client: ${newClient.name}`,
        },
      });
    }

    invalidateCache('clients');
    invalidateCache('dashboard');
    return NextResponse.json(newClient);
  } catch (error: any) {
    console.error('API Error POST /api/clients:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create client account' }, { status: 500 });
  }
}
