import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status');

    const where: any = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
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

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('API Error GET /api/invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
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
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
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

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('API Error POST /api/invoices:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    const body = await req.json();
    const { id, status, paymentNotes, amount, dueDate, issueDate, billingPeriod } = body;

    if (!id) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentNotes !== undefined && { paymentNotes }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(billingPeriod && { billingPeriod }),
      },
      include: { client: true, payments: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API Error PUT /api/invoices:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/invoices:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete invoice' }, { status: 500 });
  }
}
