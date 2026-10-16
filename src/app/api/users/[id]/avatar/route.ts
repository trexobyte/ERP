import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatar: true, name: true },
    });

    if (!user || !user.avatar) {
      const initial = (user?.name || 'U').charAt(0).toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF3B00"/><stop offset="100%" stop-color="#FF6B00"/></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(#grad)"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`;
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // External URL fallback
    if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
      return NextResponse.redirect(user.avatar);
    }

    // Base64 Data URL (e.g. uploaded images or transparent PNGs)
    if (user.avatar.startsWith('data:')) {
      const commaIndex = user.avatar.indexOf(',');
      const meta = user.avatar.slice(5, commaIndex);
      const contentType = meta.split(';')[0] || 'image/png';
      const base64Data = user.avatar.slice(commaIndex + 1);
      const buffer = Buffer.from(base64Data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        },
      });
    }

    return new NextResponse('Not found', { status: 404 });
  } catch (error) {
    console.error('Error serving user avatar:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
