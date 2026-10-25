import { describe, it, expect } from 'vitest';
import {
  parsePermissions,
  hasPermission,
  hasActionPermission,
  getRoleDefaultGranularPermissions,
  normalizeUserPermissions,
  countActivePermissions,
  PermissionsMap,
} from '@/lib/permissions';

describe('TrexoERP RBAC Permissions Engine', () => {
  describe('parsePermissions', () => {
    it('returns empty object when input is null, undefined, or empty string', () => {
      expect(parsePermissions(null)).toEqual({});
      expect(parsePermissions(undefined)).toEqual({});
      expect(parsePermissions('')).toEqual({});
    });

    it('returns parsed PermissionsMap for valid JSON string', () => {
      const validJson = JSON.stringify({
        dashboard: 'full',
        clients: 'view',
        billing: 'none',
      });
      const parsed = parsePermissions(validJson);
      expect(parsed).toEqual({
        dashboard: 'full',
        clients: 'view',
        billing: 'none',
      });
    });

    it('returns empty object when JSON string is corrupted or invalid', () => {
      const invalidJson = '{"dashboard": "full", bad_json...';
      expect(parsePermissions(invalidJson)).toEqual({});
    });
  });

  describe('hasPermission', () => {
    const adminPermissions: PermissionsMap = {
      dashboard: 'full',
      calendar: 'full',
      clients: 'full',
      tracker: 'full',
      tasks: 'full',
      billing: 'full',
      reports: 'full',
      users: 'full',
    };

    const smmPermissions: PermissionsMap = {
      dashboard: 'view',
      calendar: 'edit',
      clients: 'view',
      tracker: 'edit',
      tasks: 'edit',
      billing: 'none',
      reports: 'view',
      users: 'none',
    };

    it('grants access when user level strictly equals required level', () => {
      expect(hasPermission(smmPermissions, 'dashboard', 'view')).toBe(true);
      expect(hasPermission(smmPermissions, 'calendar', 'edit')).toBe(true);
      expect(hasPermission(adminPermissions, 'billing', 'full')).toBe(true);
    });

    it('grants access when user level exceeds required level (hierarchy)', () => {
      // 'full' exceeds 'edit' and 'view'
      expect(hasPermission(adminPermissions, 'dashboard', 'view')).toBe(true);
      expect(hasPermission(adminPermissions, 'dashboard', 'edit')).toBe(true);
      expect(hasPermission(adminPermissions, 'dashboard', 'full')).toBe(true);

      // 'edit' exceeds 'view'
      expect(hasPermission(smmPermissions, 'calendar', 'view')).toBe(true);
    });

    it('denies access when user level is lower than required level', () => {
      // 'view' cannot 'edit' or 'full'
      expect(hasPermission(smmPermissions, 'dashboard', 'edit')).toBe(false);
      expect(hasPermission(smmPermissions, 'dashboard', 'full')).toBe(false);

      // 'edit' cannot 'full'
      expect(hasPermission(smmPermissions, 'calendar', 'full')).toBe(false);

      // 'none' cannot 'view', 'edit', or 'full'
      expect(hasPermission(smmPermissions, 'billing', 'view')).toBe(false);
      expect(hasPermission(smmPermissions, 'users', 'view')).toBe(false);
    });

    it('defaults requiredLevel to view when omitted', () => {
      expect(hasPermission(smmPermissions, 'dashboard')).toBe(true);
      expect(hasPermission(smmPermissions, 'billing')).toBe(false);
    });

    it('handles stringified permissions input seamlessly', () => {
      const jsonStr = JSON.stringify({ billing: 'full', tracker: 'view' });
      expect(hasPermission(jsonStr, 'billing', 'edit')).toBe(true);
      expect(hasPermission(jsonStr, 'tracker', 'view')).toBe(true);
      expect(hasPermission(jsonStr, 'tracker', 'edit')).toBe(false);
    });

    it('denies access for undefined or empty permissions', () => {
      expect(hasPermission(null, 'dashboard', 'view')).toBe(false);
      expect(hasPermission(undefined, 'dashboard', 'view')).toBe(false);
      expect(hasPermission({}, 'dashboard', 'view')).toBe(false);
    });

    it('denies access when module is not defined in permissions map', () => {
      const partial: PermissionsMap = { clients: 'full' };
      expect(hasPermission(partial, 'billing', 'view')).toBe(false);
    });
  });

  describe('hasActionPermission & Granular Individual Permissions', () => {
    it('supports individual granular permissions objects per module', () => {
      const customMemberPerms = {
        calendar: { view: true, create: true, edit: false, delete: false },
        billing: { view: true, create: false, edit: false, delete: false, manage: false },
        users: { view: false, create: false, edit: false, delete: false },
      };

      // Can view and create shoots, but cannot edit or delete
      expect(hasActionPermission(customMemberPerms, 'calendar', 'view')).toBe(true);
      expect(hasActionPermission(customMemberPerms, 'calendar', 'create')).toBe(true);
      expect(hasActionPermission(customMemberPerms, 'calendar', 'edit')).toBe(false);
      expect(hasActionPermission(customMemberPerms, 'calendar', 'delete')).toBe(false);

      // Can view billing, but cannot create or manage payments
      expect(hasActionPermission(customMemberPerms, 'billing', 'view')).toBe(true);
      expect(hasActionPermission(customMemberPerms, 'billing', 'create')).toBe(false);
      expect(hasActionPermission(customMemberPerms, 'billing', 'manage')).toBe(false);

      // Cannot view users
      expect(hasActionPermission(customMemberPerms, 'users', 'view')).toBe(false);
    });

    it('evaluates string role levels in hasActionPermission correctly', () => {
      const rolePerms = {
        calendar: 'edit',
        billing: 'full',
      };

      // 'edit' grants view, create, edit, but not delete
      expect(hasActionPermission(rolePerms, 'calendar', 'view')).toBe(true);
      expect(hasActionPermission(rolePerms, 'calendar', 'create')).toBe(true);
      expect(hasActionPermission(rolePerms, 'calendar', 'edit')).toBe(true);
      expect(hasActionPermission(rolePerms, 'calendar', 'delete')).toBe(false);

      // 'full' grants all including delete and manage
      expect(hasActionPermission(rolePerms, 'billing', 'view')).toBe(true);
      expect(hasActionPermission(rolePerms, 'billing', 'create')).toBe(true);
      expect(hasActionPermission(rolePerms, 'billing', 'delete')).toBe(true);
      expect(hasActionPermission(rolePerms, 'billing', 'manage')).toBe(true);
    });

    it('ensures individual permissions take precedence over role defaults without accidental privilege escalation', () => {
      // Two users with Content/Shoot Manager role
      // Member A has full calendar access
      const memberA = getRoleDefaultGranularPermissions('Content/Shoot Manager');
      expect(hasActionPermission(memberA, 'calendar', 'delete')).toBe(true);

      // Member B has customized permissions: restricted from deleting calendar events or deliverables
      const memberB = {
        ...memberA,
        calendar: { ...memberA.calendar, delete: false },
        tracker: { ...memberA.tracker, delete: false },
      };

      expect(hasActionPermission(memberB, 'calendar', 'view')).toBe(true);
      expect(hasActionPermission(memberB, 'calendar', 'create')).toBe(true);
      expect(hasActionPermission(memberB, 'calendar', 'edit')).toBe(true);
      expect(hasActionPermission(memberB, 'calendar', 'delete')).toBe(false);
      expect(hasActionPermission(memberB, 'tracker', 'delete')).toBe(false);
    });

    it('correctly normalizes permissions and counts active permissions', () => {
      const perms = {
        dashboard: { view: true },
        calendar: { view: true, create: true, edit: false, delete: false },
      };

      const normalized = normalizeUserPermissions(perms);
      expect(normalized.dashboard.view).toBe(true);
      expect(normalized.calendar.view).toBe(true);
      expect(normalized.calendar.create).toBe(true);
      expect(normalized.calendar.edit).toBe(false);
      expect(normalized.clients.view).toBe(false);

      const stats = countActivePermissions(perms);
      expect(stats.enabled).toBe(3); // dashboard.view, calendar.view, calendar.create
      expect(stats.total).toBe(29);
    });
  });
});

