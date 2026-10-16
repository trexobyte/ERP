import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;
    if (!userId) {
      const firstUser = await prisma.user.findFirst();
      userId = firstUser?.id;
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/invoices/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete invoice' }, { status: 500 });
  }
}
