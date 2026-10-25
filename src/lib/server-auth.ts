import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  ERPModuleKey,
  PermissionAction,
  hasActionPermission,
  parsePermissions,
  UserPermissionsMap,
  ROLE_PERMISSIONS_PRESETS,
} from '@/lib/permissions';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: UserPermissionsMap;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return null;
    }

    const sessionUser = session.user as any;
    const userId = sessionUser.id;

    if (!userId) {
      return null;
    }

    let dbUser: any = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
      });
    } catch (dbErr) {
      // In tests or transient DB connection drop, fallback to session data
    }

    if (dbUser && !dbUser.active) {
      return null;
    }

    const roleName = dbUser?.role?.name || sessionUser.roleName || 'Viewer';
    const isSuperAdmin = roleName === 'Super Admin';

    let effectivePermissions: UserPermissionsMap;
    if (dbUser?.permissions) {
      effectivePermissions = parsePermissions(dbUser.permissions);
    } else if (sessionUser.permissions && typeof sessionUser.permissions === 'object') {
      effectivePermissions = sessionUser.permissions;
    } else if (typeof sessionUser.permissions === 'string' && sessionUser.permissions.trim()) {
      effectivePermissions = parsePermissions(sessionUser.permissions);
    } else if (dbUser?.role?.permissions) {
      effectivePermissions = parsePermissions(dbUser.role.permissions);
    } else if (ROLE_PERMISSIONS_PRESETS[roleName]) {
      effectivePermissions = ROLE_PERMISSIONS_PRESETS[roleName];
    } else {
      effectivePermissions = ROLE_PERMISSIONS_PRESETS['Viewer'];
    }

    return {
      id: dbUser?.id || userId,
      email: dbUser?.email || sessionUser.email,
      name: dbUser?.name || sessionUser.name,
      roleName,
      isSuperAdmin,
      permissions: effectivePermissions,
    };
  } catch (err) {
    console.error('Error in getAuthenticatedUser:', err);
    return null;
  }
}

export function checkUserAction(
  user: AuthenticatedUser,
  module: ERPModuleKey,
  action: PermissionAction = 'view'
): boolean {
  if (user.isSuperAdmin) {
    return true;
  }
  return hasActionPermission(user.permissions, module, action);
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(
  message = 'Forbidden: You do not have permission to perform this action'
): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
