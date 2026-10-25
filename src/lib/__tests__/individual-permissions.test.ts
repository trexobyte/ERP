import { describe, it, expect } from 'vitest';
import {
  ERP_MODULE_DEFINITIONS,
  getRoleDefaultGranularPermissions,
  hasActionPermission,
  hasPermission,
  normalizeUserPermissions,
  countActivePermissions,
  parsePermissions,
  GranularPermissionsMap,
} from '@/lib/permissions';
import { checkUserAction, AuthenticatedUser } from '@/lib/server-auth';

describe('Individual Customizable Permissions Workflow', () => {
  describe('1. Member Creation with Custom Permissions', () => {
    it('initializes default granular permissions from chosen role', () => {
      const managerDefaults = getRoleDefaultGranularPermissions('Manager');
      expect(managerDefaults.calendar?.view).toBe(true);
      expect(managerDefaults.calendar?.create).toBe(true);
      expect(managerDefaults.calendar?.edit).toBe(true);
      expect(managerDefaults.calendar?.delete).toBe(true);
      expect(managerDefaults.billing?.view).toBe(true);
      expect(managerDefaults.billing?.create).toBe(false);
      expect(managerDefaults.users?.view).toBe(true);
      expect(managerDefaults.users?.create).toBe(false);
    });

    it('allows Super Admin to customize permissions during creation independently of role', () => {
      const roleDefaults = getRoleDefaultGranularPermissions('Social Media Manager');
      // Customized permissions: give billing view and client edit, but revoke calendar edit
      const customPermissions: GranularPermissionsMap = {
        ...roleDefaults,
        billing: { view: true, create: false, edit: false, delete: false, manage: false },
        clients: { view: true, create: false, edit: true, delete: false },
        calendar: { view: true, create: false, edit: false, delete: false },
      };

      const normalized = normalizeUserPermissions(customPermissions);
      expect(hasActionPermission(normalized, 'billing', 'view')).toBe(true);
      expect(hasActionPermission(normalized, 'billing', 'manage')).toBe(false);
      expect(hasActionPermission(normalized, 'clients', 'edit')).toBe(true);
      expect(hasActionPermission(normalized, 'clients', 'delete')).toBe(false);
      expect(hasActionPermission(normalized, 'calendar', 'edit')).toBe(false);
      expect(hasActionPermission(normalized, 'calendar', 'view')).toBe(true);
    });

    it('accurately counts active individual permissions for the UI badge', () => {
      const allSuperAdmin = getRoleDefaultGranularPermissions('Super Admin');
      expect(countActivePermissions(allSuperAdmin).enabled).toBe(29);

      const emptyPerms: GranularPermissionsMap = {};
      expect(countActivePermissions(emptyPerms).enabled).toBe(0);

      const custom: GranularPermissionsMap = {
        dashboard: { view: true }, // 1
        calendar: { view: true, create: true, edit: false, delete: false }, // 2
        billing: { view: true, create: false, edit: false, delete: false, manage: false }, // 1
      };
      expect(countActivePermissions(custom).enabled).toBe(4);
    });
  });

  describe('2. Editing Permissions Afterwards with Immediate Effect', () => {
    it('updates effective permissions when modified without recreating user', () => {
      let memberPermissions = getRoleDefaultGranularPermissions('Content/Shoot Manager');

      // Initial state: can create calendar items, but cannot view or manage billing
      expect(hasActionPermission(memberPermissions, 'calendar', 'create')).toBe(true);
      expect(hasActionPermission(memberPermissions, 'billing', 'view')).toBe(false);
      expect(hasActionPermission(memberPermissions, 'billing', 'manage')).toBe(false);

      // Super Admin edits member permissions afterwards:
      memberPermissions = {
        ...memberPermissions,
        calendar: { view: true, create: false, edit: false, delete: false },
        billing: { view: true, create: true, edit: false, delete: false, manage: false },
      };

      // Immediately takes effect
      expect(hasActionPermission(memberPermissions, 'calendar', 'create')).toBe(false);
      expect(hasActionPermission(memberPermissions, 'calendar', 'view')).toBe(true);
      expect(hasActionPermission(memberPermissions, 'billing', 'view')).toBe(true);
      expect(hasActionPermission(memberPermissions, 'billing', 'create')).toBe(true);
      expect(hasActionPermission(memberPermissions, 'billing', 'manage')).toBe(false);
    });

    it('serializes and deserializes accurately across JSON storage in database', () => {
      const perms: GranularPermissionsMap = {
        dashboard: { view: true },
        tasks: { view: true, create: true, edit: true, delete: false },
        clients: { view: true, create: false, edit: false, delete: false },
      };

      const dbJson = JSON.stringify(perms);
      const restored = parsePermissions(dbJson);

      expect(hasActionPermission(restored, 'tasks', 'create')).toBe(true);
      expect(hasActionPermission(restored, 'tasks', 'delete')).toBe(false);
      expect(hasActionPermission(restored, 'clients', 'view')).toBe(true);
      expect(hasActionPermission(restored, 'clients', 'edit')).toBe(false);
    });
  });

  describe('3. Role vs Individual Permissions Decoupling', () => {
    it('allows two members with the exact same role to have completely distinct permissions', () => {
      const memberA: AuthenticatedUser = {
        id: 'member-a',
        name: 'Member Alpha',
        email: 'alpha@trexobyte.com',
        roleName: 'Client Communication',
        isSuperAdmin: false,
        permissions: {
          ...getRoleDefaultGranularPermissions('Client Communication'),
          clients: { view: true, create: true, edit: true, delete: true }, // full client access
        },
      };

      const memberB: AuthenticatedUser = {
        id: 'member-b',
        name: 'Member Beta',
        email: 'beta@trexobyte.com',
        roleName: 'Client Communication',
        isSuperAdmin: false,
        permissions: {
          ...getRoleDefaultGranularPermissions('Client Communication'),
          clients: { view: true, create: false, edit: false, delete: false }, // read-only client access
        },
      };

      // Both have identical role title
      expect(memberA.roleName).toBe(memberB.roleName);

      // Member A has create and delete
      expect(checkUserAction(memberA, 'clients', 'create')).toBe(true);
      expect(checkUserAction(memberA, 'clients', 'delete')).toBe(true);

      // Member B is strictly restricted
      expect(checkUserAction(memberB, 'clients', 'create')).toBe(false);
      expect(checkUserAction(memberB, 'clients', 'delete')).toBe(false);
      expect(checkUserAction(memberB, 'clients', 'view')).toBe(true);
    });

    it('ensures explicit individual false permissions override any role default', () => {
      // Role 'Manager' normally has calendar.delete = true
      const roleDefaults = getRoleDefaultGranularPermissions('Manager');
      expect(roleDefaults.calendar?.delete).toBe(true);

      // Super Admin specifically unchecks calendar.delete for this user
      const customUserPermissions: GranularPermissionsMap = {
        ...roleDefaults,
        calendar: { view: true, create: true, edit: true, delete: false },
      };

      const user: AuthenticatedUser = {
        id: 'manager-user',
        name: 'Restricted Manager',
        email: 'mgr@trexobyte.com',
        roleName: 'Manager',
        isSuperAdmin: false,
        permissions: customUserPermissions,
      };

      expect(checkUserAction(user, 'calendar', 'delete')).toBe(false);
      expect(checkUserAction(user, 'calendar', 'edit')).toBe(true);
    });
  });

  describe('4. Security & Privilege Escalation Protection', () => {
    it('blocks unauthorized users from managing users or altering roles', () => {
      const standardUser: AuthenticatedUser = {
        id: 'std-user',
        name: 'Standard User',
        email: 'std@trexobyte.com',
        roleName: 'Social Media Manager',
        isSuperAdmin: false,
        permissions: getRoleDefaultGranularPermissions('Social Media Manager'),
      };

      expect(checkUserAction(standardUser, 'users', 'create')).toBe(false);
      expect(checkUserAction(standardUser, 'users', 'edit')).toBe(false);
      expect(checkUserAction(standardUser, 'users', 'delete')).toBe(false);
      expect(checkUserAction(standardUser, 'audit', 'manage')).toBe(false);
    });

    it('protects critical admin capabilities and preserves Super Admin override', () => {
      const superAdmin: AuthenticatedUser = {
        id: 'admin-1',
        name: 'Ketan',
        email: 'ketan@trexobyte.com',
        roleName: 'Super Admin',
        isSuperAdmin: true,
        permissions: getRoleDefaultGranularPermissions('Super Admin'),
      };

      // Super Admin has all 29 actions across 9 modules
      ERP_MODULE_DEFINITIONS.forEach((mod) => {
        mod.actions.forEach((act) => {
          expect(checkUserAction(superAdmin, mod.key, act.key)).toBe(true);
        });
      });
    });
  });

  describe('5. Audit Rollback & State Restoration', () => {
    it('correctly models saving previous permissions snapshot for 1-click restore', () => {
      const originalPermissions: GranularPermissionsMap = {
        billing: { view: false, create: false, edit: false, delete: false, manage: false },
        calendar: { view: true, create: true, edit: true, delete: true },
      };

      // Super admin modifies permissions
      const updatedPermissions: GranularPermissionsMap = {
        billing: { view: true, create: true, edit: false, delete: false, manage: false },
        calendar: { view: true, create: false, edit: false, delete: false },
      };

      // Audit snapshot stores previous state
      const auditSnapshot = {
        entityType: 'User',
        entityId: 'user-123',
        action: 'UPDATE',
        previousState: JSON.stringify({
          permissions: JSON.stringify(originalPermissions),
        }),
      };

      // Undo operation deserializes previous state
      const parsedPrevious = JSON.parse(auditSnapshot.previousState);
      const restoredPermissions = parsePermissions(parsedPrevious.permissions);

      expect(hasActionPermission(restoredPermissions, 'billing', 'view')).toBe(false);
      expect(hasActionPermission(restoredPermissions, 'calendar', 'delete')).toBe(true);
    });
  });
});
