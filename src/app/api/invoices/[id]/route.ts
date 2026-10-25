import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateCache } from '@/lib/cache';
import {
  getAuthenticatedUser,
  checkUserAction,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }
    if (!checkUserAction(caller, 'billing', 'delete')) {
      return forbiddenResponse('You do not have permission to delete invoices.');
    }
    const userId = caller.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    await prisma.invoice.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'Invoice',
        entityId: id,
        details: `Deleted invoice ${invoice.invoiceNumber} for ${invoice.client.name}`,
      },
    });

    await invalidateCache('invoices');
    await invalidateCache('clients');
    await invalidateCache('dashboard');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/invoices/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete invoice' }, { status: 500 });
  }
}
