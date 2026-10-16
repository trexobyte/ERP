import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'kEcdz2zeFok2+ALwhAfsXLE44lMSsJt/K25Ez6tbJOg=',
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
