import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            role: true,
            assignedClients: {
              include: {
                client: true,
              },
            },
          },
        });

        if (!user || !user.active) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
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
          permissions: user.role?.permissions || '{}',
          assignedClientIds: user.assignedClients.map((a) => a.clientId),
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
  secret: process.env.NEXTAUTH_SECRET || 'trexobyte-erp-secret-key-kathmandu-2026-secure-jwt',
};
