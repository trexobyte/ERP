import { describe, it, expect } from 'vitest';
import { parsePermissions, hasPermission, PermissionsMap } from '@/lib/permissions';

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
});
