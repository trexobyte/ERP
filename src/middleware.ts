import { withAuth } from 'next-auth/middleware';
import { getAuthSecret } from '@/lib/env';

export default withAuth({
  pages: {
    signIn: '/login',
  },
  secret: getAuthSecret(),
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth authentication routes)
     * - login (the login screen)
     * - _next/static & _next/image (Next.js assets)
     * - favicon.ico and static public files
     */
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
