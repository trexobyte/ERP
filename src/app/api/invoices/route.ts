import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { toDatabaseDateString } from '@/lib/date-utils';

import {
  getAuthenticatedUser,
  checkUserAction,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!checkUserAction(caller, 'billing', 'view')) {
      return forbiddenResponse('You do not have permission to view billing and invoices.');
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const cacheKey = `invoices:${clientId || ''}:${status || ''}`;
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    let invoices: any[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        invoices = await prisma.invoice.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                color: true,
                logo: true,
              },
            },
            payments: {
              include: {
                recordedBy: {
                  select: { name: true },
                },
              },
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: { issueDate: 'desc' },
        });
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }

    if (invoices.length > 0) {
      await setCached(cacheKey, invoices, 30);
    }
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('API Error GET /api/invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!checkUserAction(caller, 'billing', 'create')) {
      return forbiddenResponse('You do not have permission to create invoices.');
    }
    const userId = caller.id;

    const body = await req.json();
    const { clientId, invoiceNumber, amount, issueDate, dueDate, status, billingPeriod, paymentNotes } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client selection is required' }, { status: 400 });
    }

    const parsedAmount = typeof amount === 'number'
      ? amount
      : parseFloat(String(amount || '0').replace(/[^0-9.]/g, '')) || 0;

    if (parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invoice amount must be greater than 0' }, { status: 400 });
    }

    // Auto-generate invoice number if missing or handle duplicate collision
    let finalInvNum = invoiceNumber ? invoiceNumber.trim() : `TB-2026-${Date.now().toString().slice(-4)}`;
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: finalInvNum } });
    if (existing) {
      finalInvNum = `TB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber: finalInvNum,
        amount: parsedAmount,
        issueDate: new Date(toDatabaseDateString(issueDate) || toDatabaseDateString(new Date())!),
        dueDate: new Date(toDatabaseDateString(dueDate) || toDatabaseDateString(new Date())!),
        status: status || 'SENT',
        billingPeriod: billingPeriod || 'Current Month',
        paymentNotes: paymentNotes || null,
      },
      include: {
        client: true,
        payments: true,
      },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'Invoice',
          entityId: invoice.id,
          details: `Created invoice ${invoice.invoiceNumber} (NPR ${invoice.amount}) for ${invoice.client.name}`,
        },
      });
    }

    await invalidateCache('invoices');
    await invalidateCache('clients');
    await invalidateCache('dashboard');
    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('API Error POST /api/invoices:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!checkUserAction(caller, 'billing', 'edit')) {
      return forbiddenResponse('You do not have permission to edit billing records.');
    }
    const userId = caller.id;

    const body = await req.json();
    const { id, status, paymentNotes, amount, dueDate, issueDate, billingPeriod } = body;

    if (!id) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentNotes !== undefined && { paymentNotes }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(dueDate && { dueDate: new Date(toDatabaseDateString(dueDate)!) }),
        ...(issueDate && { issueDate: new Date(toDatabaseDateString(issueDate)!) }),
        ...(billingPeriod && { billingPeriod }),
      },
      include: { client: true, payments: true },
    });

    await invalidateCache('invoices');
    await invalidateCache('clients');
    await invalidateCache('dashboard');
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API Error PUT /api/invoices:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!checkUserAction(caller, 'billing', 'delete')) {
      return forbiddenResponse('You do not have permission to delete invoices.');
    }
    const userId = caller.id;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    await prisma.invoice.delete({ where: { id } });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          entityType: 'Invoice',
          entityId: id,
          details: `Deleted invoice ${invoice.invoiceNumber} for ${invoice.client.name}`,
        },
      });
    }

    await invalidateCache('invoices');
    await invalidateCache('clients');
    await invalidateCache('dashboard');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/invoices:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete invoice' }, { status: 500 });
  }
}
