import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuthSecret, isDevPasswordFallbackAllowed } from '@/lib/env';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'ketan@trexobyte.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rawEmail = credentials.email.toLowerCase().trim();
        const emailSearch = rawEmail.includes('@') ? rawEmail : `${rawEmail}@trexobyte.com`;
        const rawPassword = credentials.password;
        const trimmedPassword = rawPassword.trim();

        // 1. Resilient database user lookup with retry loop
        let user: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  { email: emailSearch },
                  { email: rawEmail },
                ],
              },
              include: {
                role: true,
                assignedClients: {
                  include: {
                    client: true,
                  },
                },
              },
            });
            break;
          } catch (err) {
            console.warn(`Auth user lookup retry ${attempt + 1}:`, err);
            if (attempt === 2) return null;
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          }
        }

        if (!user || !user.active) {
          return null;
        }

        // 2. Multi-tier password check
        let isValid = false;
        try {
          if (user.password) {
            isValid = await bcrypt.compare(rawPassword, user.password);
            if (!isValid && trimmedPassword !== rawPassword) {
              isValid = await bcrypt.compare(trimmedPassword, user.password);
            }
          }
        } catch (e) {
          console.warn('bcrypt.compare error:', e);
        }

        // 3. Optional agency fallback: password123 (strictly gated behind non-production flag)
        if (!isValid) {
          const lowerTrimmed = trimmedPassword.toLowerCase();
          const isFallbackAttempt = lowerTrimmed === 'password123' || rawPassword === 'password123';

          if (isFallbackAttempt) {
            if (isDevPasswordFallbackAllowed()) {
              isValid = true;
              console.warn(
                `DEV WARNING: User ${user.email} authenticated using development fallback password ('password123').`
              );
              // Auto-heal password in DB so bcrypt hash is valid in local development
              try {
                const newHash = await bcrypt.hash('password123', 10);
                await prisma.user.update({
                  where: { id: user.id },
                  data: { password: newHash },
                });
              } catch (healErr) {
                console.warn('Auto-heal password failed:', healErr);
              }
            } else {
              console.warn(
                `SECURITY ALERT: Fallback password ('password123') attempted for ${user.email} but was rejected. ALLOW_DEV_PASSWORD_FALLBACK is disabled or environment is production.`
              );
            }
          }
        }

        if (!isValid) {
          return null;
        }

        const avatarUrl =
          user.avatar && !user.avatar.startsWith('data:')
            ? user.avatar
            : `/api/users/${user.id}/avatar`;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          department: user.department,
          avatar: avatarUrl,
          roleId: user.roleId || '',
          roleName: user.role?.name || 'Viewer',
          permissions: user.permissions ?? user.role?.permissions ?? '{}',
          assignedClientIds: user.assignedClients?.map((a: any) => a.clientId) || [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.department = (user as any).department;
        token.avatar =
          (user as any).avatar && !(user as any).avatar.startsWith('data:')
            ? (user as any).avatar
            : `/api/users/${user.id}/avatar`;
        token.roleId = (user as any).roleId;
        token.roleName = (user as any).roleName;
        token.permissions = (user as any).permissions;
        token.assignedClientIds = (user as any).assignedClientIds;
      }
      if (trigger === 'update' && session) {
        const safeSession = { ...session };
        if (typeof safeSession.avatar === 'string' && safeSession.avatar.startsWith('data:')) {
          safeSession.avatar = `/api/users/${token.id}/avatar`;
        }
        return { ...token, ...safeSession };
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).department = token.department;
        (session.user as any).avatar = token.avatar || `/api/users/${token.id}/avatar`;
        (session.user as any).roleId = token.roleId;
        (session.user as any).roleName = token.roleName;
        (session.user as any).permissions = token.permissions;
        (session.user as any).assignedClientIds = token.assignedClientIds;
      }
      return session;
    },
  },
  secret: getAuthSecret(),
};
