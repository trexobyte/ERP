import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getCached, setCached, invalidateCache } from '@/lib/cache';
import { isDevPasswordFallbackAllowed } from '@/lib/env';
import {
  getAuthenticatedUser,
  checkUserAction,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/server-auth';
import {
  getRoleDefaultGranularPermissions,
  normalizeUserPermissions,
  parsePermissions,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }

    if (!checkUserAction(caller, 'users', 'view')) {
      return forbiddenResponse('You do not have permission to view team members.');
    }

    const cacheKey = 'users:all';
    const cached = await getCached<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const users = await prisma.user.findMany({
      include: {
        role: true,
        assignedClients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Ensure each user has parsed or normalized permissions map
    const safeUsers = users.map((u) => {
      const { password, ...rest } = u;
      let effectivePerms: any = {};
      if (u.permissions) {
        effectivePerms = parsePermissions(u.permissions);
      } else if (u.role?.permissions) {
        effectivePerms = parsePermissions(u.role.permissions);
      } else {
        effectivePerms = getRoleDefaultGranularPermissions(u.role?.name);
      }

      return {
        ...rest,
        permissions: effectivePerms,
      };
    });

    await setCached(cacheKey, safeUsers, 30);
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('API Error GET /api/users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }

    if (!checkUserAction(caller, 'users', 'create')) {
      return forbiddenResponse('You do not have permission to create team members.');
    }

    const body = await req.json();
    const { name, email, password, department, roleId, avatar, active, assignedClientIds, permissions } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and Email are required fields' }, { status: 400 });
    }

    // Only Super Admins can configure individual custom permissions
    if (permissions !== undefined && !caller.isSuperAdmin) {
      return forbiddenResponse('Only Super Admins are authorized to configure individual member permissions.');
    }

    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const defaultPass = isDevPasswordFallbackAllowed() ? 'password123' : Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(password || defaultPass, 10);

    let finalRoleId = roleId || null;
    let assignedRole: any = null;
    if (finalRoleId) {
      assignedRole = await prisma.role.findUnique({ where: { id: finalRoleId } });
    }
    if (!finalRoleId || !assignedRole) {
      assignedRole =
        (await prisma.role.findFirst({ where: { name: 'Social Media Manager' } })) ||
        (await prisma.role.findFirst());
      finalRoleId = assignedRole?.id || null;
    }

    // Compute effective individual permissions:
    // If Super Admin provided custom permissions, format them.
    // Otherwise, seed from the selected role's default granular permissions.
    let finalPermissionsStr: string;
    if (permissions && caller.isSuperAdmin) {
      const normalized = normalizeUserPermissions(permissions, assignedRole?.name);
      finalPermissionsStr = JSON.stringify(normalized);
    } else {
      const roleDefaults = getRoleDefaultGranularPermissions(assignedRole?.permissions || assignedRole?.name);
      finalPermissionsStr = JSON.stringify(roleDefaults);
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        department: department || 'Social Media',
        roleId: finalRoleId,
        permissions: finalPermissionsStr,
        avatar: avatar || null,
        active: active !== undefined ? active : true,
        assignedClients: {
          create: (assignedClientIds || []).map((cId: string) => ({
            clientId: cId,
          })),
        },
      },
      include: {
        role: true,
        assignedClients: { include: { client: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: caller.id,
        action: 'CREATE',
        entityType: 'User',
        entityId: newUser.id,
        details: `Created new team member: ${newUser.name} (${newUser.email}) with role "${newUser.role?.name}" and custom individual permissions.`,
        changes: JSON.stringify([
          { field: 'role', oldVal: null, newVal: newUser.role?.name },
          { field: 'department', oldVal: null, newVal: newUser.department },
          { field: 'permissions', oldVal: null, newVal: finalPermissionsStr },
        ]),
      },
    });

    await invalidateCache('users');
    const { password: _, ...safeUser } = newUser;
    return NextResponse.json({
      ...safeUser,
      permissions: parsePermissions(safeUser.permissions),
    });
  } catch (error: any) {
    console.error('API Error POST /api/users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { id, name, email, password, department, roleId, avatar, active, assignedClientIds, permissions } = body;

    const targetUserId = id || caller.id;
    const isSelfUpdate = targetUserId === caller.id;

    // Check authorization:
    // If updating someone else: caller must have 'users: edit' or be Super Admin
    if (!isSelfUpdate && !checkUserAction(caller, 'users', 'edit')) {
      return forbiddenResponse('You do not have permission to modify other team members.');
    }

    // Security check: Only Super Admins can modify permissions or change roles or active status
    if ((permissions !== undefined || roleId !== undefined || active !== undefined) && !caller.isSuperAdmin) {
      return forbiddenResponse('Only Super Admins are authorized to customize permissions, roles, or account status.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    if (assignedClientIds && (caller.isSuperAdmin || checkUserAction(caller, 'users', 'edit'))) {
      await prisma.clientAssignment.deleteMany({ where: { userId: targetUserId } });
      await prisma.clientAssignment.createMany({
        data: assignedClientIds.map((cId: string) => ({
          userId: targetUserId,
          clientId: cId,
        })),
      });
    }

    const updateData: any = {};
    const changes: any[] = [];

    if (name && name.trim() !== targetUser.name) {
      updateData.name = name.trim();
      changes.push({ field: 'name', oldVal: targetUser.name, newVal: updateData.name });
    }
    if (email && email.toLowerCase().trim() !== targetUser.email) {
      updateData.email = email.toLowerCase().trim();
      changes.push({ field: 'email', oldVal: targetUser.email, newVal: updateData.email });
    }
    if (department && department !== targetUser.department) {
      updateData.department = department;
      changes.push({ field: 'department', oldVal: targetUser.department, newVal: department });
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
      changes.push({ field: 'password', oldVal: '******', newVal: '******' });
    }

    // Role and Permissions update (Super Admin strictly verified)
    if (caller.isSuperAdmin) {
      if (roleId && roleId !== targetUser.roleId) {
        updateData.roleId = roleId;
        const newRole = await prisma.role.findUnique({ where: { id: roleId } });
        changes.push({ field: 'role', oldVal: targetUser.role?.name, newVal: newRole?.name });
      }
      if (active !== undefined && active !== targetUser.active) {
        updateData.active = active;
        changes.push({ field: 'active', oldVal: targetUser.active, newVal: active });
      }
      if (permissions !== undefined) {
        const normalized = normalizeUserPermissions(permissions, targetUser.role?.name);
        const permsString = JSON.stringify(normalized);
        if (permsString !== targetUser.permissions) {
          updateData.permissions = permsString;
          changes.push({ field: 'permissions', oldVal: targetUser.permissions, newVal: permsString });
        }
      }
    }

    // Snapshot previous state for rollback and audit trail
    const previousStateSnapshot = JSON.stringify({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      department: targetUser.department,
      roleId: targetUser.roleId,
      active: targetUser.active,
      permissions: targetUser.permissions,
    });

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      include: {
        role: true,
        assignedClients: { include: { client: true } },
      },
    });

    if (changes.length > 0) {
      const details = isSelfUpdate
        ? `Profile updated by user: ${updatedUser.name}`
        : `Updated member "${updatedUser.name}" (${updatedUser.email}): ${changes.map((c) => c.field).join(', ')}`;

      await prisma.activityLog.create({
        data: {
          userId: caller.id,
          action: 'UPDATE',
          entityType: 'User',
          entityId: targetUserId,
          details,
          changes: JSON.stringify(changes),
          previousState: previousStateSnapshot,
        },
      });
    }

    await invalidateCache('users');
    const { password: _, ...safeUser } = updatedUser;
    return NextResponse.json({
      ...safeUser,
      permissions: parsePermissions(safeUser.permissions),
    });
  } catch (error: any) {
    console.error('API Error PUT /api/users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const caller = await getAuthenticatedUser();
    if (!caller) {
      return unauthorizedResponse();
    }

    if (!checkUserAction(caller, 'users', 'delete')) {
      return forbiddenResponse('You do not have permission to delete team members.');
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Protect Super Admin safeguards: cannot delete the last active Super Admin or last user
    if (user.role?.name === 'Super Admin') {
      const superAdminCount = await prisma.user.count({
        where: { role: { name: 'Super Admin' }, active: true },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete or remove the last remaining Super Admin account.' },
          { status: 400 }
        );
      }
    }

    const userCount = await prisma.user.count();
    if (userCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining user account.' }, { status: 400 });
    }

    // Delete assignments first
    await prisma.clientAssignment.deleteMany({ where: { userId: id } });

    // Delete user
    await prisma.user.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: caller.id,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
        details: `Deleted team member account: ${user.name} (${user.email})`,
        previousState: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          roleId: user.roleId,
          active: user.active,
          permissions: user.permissions,
        }),
      },
    });

    await invalidateCache('users');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error DELETE /api/users:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
