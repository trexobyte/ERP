import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { invalidateCache } from '@/lib/cache';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    let validUserId: string | null = null;
    if (userId) {
      const userObj = await prisma.user.findUnique({ where: { id: userId } });
      if (userObj) validUserId = userObj.id;
    }

    const body = await req.json();
    const { invoiceId, amountReceived, paymentDate, notes } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice selection is required' }, { status: 400 });
    }

    const invoiceExists = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoiceExists) {
      return NextResponse.json({ error: 'Selected invoice record was not found' }, { status: 404 });
    }

    const parsedAmount = typeof amountReceived === 'number'
      ? amountReceived
      : parseFloat(String(amountReceived || '0').replace(/[^0-9.]/g, '')) || 0;

    if (parsedAmount <= 0) {
      return NextResponse.json({ error: 'Payment amount received must be greater than 0' }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amountReceived: parsedAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        recordedById: validUserId,
        notes: notes || null,
      },
    });

    // Recalculate total payments for this invoice and update invoice status
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, client: true },
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amountReceived, 0);
      let newStatus = invoice.status;
      if (totalPaid >= invoice.amount) {
        newStatus = 'PAID';
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });

      if (validUserId) {
        await prisma.activityLog.create({
          data: {
            userId: validUserId,
            action: 'UPDATE',
            entityType: 'Invoice',
            entityId: invoice.id,
            details: `Recorded payment of NPR ${payment.amountReceived.toLocaleString()} for invoice ${invoice.invoiceNumber}`,
          },
        });
      }
    }

    await invalidateCache('invoices');
    await invalidateCache('clients');
    await invalidateCache('dashboard');
    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('API Error POST /api/invoices/payment:', error);
    return NextResponse.json({ error: error?.message || 'Failed to record payment' }, { status: 500 });
  }
}
