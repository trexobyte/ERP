import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkUserAction, AuthenticatedUser } from '@/lib/server-auth';
import {
  getRoleDefaultGranularPermissions,
  hasActionPermission,
  normalizeUserPermissions,
  countActivePermissions,
} from '@/lib/permissions';

describe('Server & API Authorization Safeguards', () => {
  const superAdminUser: AuthenticatedUser = {
    id: 'user-admin',
    name: 'Ketan Shrestha',
    email: 'ketan@trexobyte.com',
    roleName: 'Super Admin',
    isSuperAdmin: true,
    permissions: getRoleDefaultGranularPermissions('Super Admin'),
  };

  const restrictedManagerUser: AuthenticatedUser = {
    id: 'user-smm',
    name: 'Sneha Pandey',
    email: 'sneha@trexobyte.com',
    roleName: 'Social Media Manager',
    isSuperAdmin: false,
    permissions: {
      ...getRoleDefaultGranularPermissions('Social Media Manager'),
      // Individual customization: Super Admin explicitly revoked calendar edit
      calendar: { view: true, create: false, edit: false, delete: false },
      // But granted billing view
      billing: { view: true, create: false, edit: false, delete: false, manage: false },
    },
  };

  it('Super Admin bypasses module checks with full administrative access', () => {
    expect(checkUserAction(superAdminUser, 'users', 'create')).toBe(true);
    expect(checkUserAction(superAdminUser, 'users', 'delete')).toBe(true);
    expect(checkUserAction(superAdminUser, 'billing', 'manage')).toBe(true);
    expect(checkUserAction(superAdminUser, 'audit', 'manage')).toBe(true);
  });

  it('strictly enforces individual custom permissions for regular members', () => {
    // Has billing view granted individually
    expect(checkUserAction(restrictedManagerUser, 'billing', 'view')).toBe(true);
    // Denied billing manage/payment
    expect(checkUserAction(restrictedManagerUser, 'billing', 'manage')).toBe(false);

    // Can view calendar, but calendar create/edit revoked individually
    expect(checkUserAction(restrictedManagerUser, 'calendar', 'view')).toBe(true);
    expect(checkUserAction(restrictedManagerUser, 'calendar', 'create')).toBe(false);
    expect(checkUserAction(restrictedManagerUser, 'calendar', 'edit')).toBe(false);

    // Cannot manage users or audit
    expect(checkUserAction(restrictedManagerUser, 'users', 'create')).toBe(false);
    expect(checkUserAction(restrictedManagerUser, 'users', 'edit')).toBe(false);
    expect(checkUserAction(restrictedManagerUser, 'audit', 'manage')).toBe(false);
  });

  it('prevents privilege escalation when user has role title but custom permissions are restricted', () => {
    // Two users with same role: 'Billing/Finance'
    const fullBillingUser: AuthenticatedUser = {
      id: 'user-bill-1',
      name: 'Bikash 1',
      email: 'b1@trexobyte.com',
      roleName: 'Billing/Finance',
      isSuperAdmin: false,
      permissions: getRoleDefaultGranularPermissions('Billing/Finance'),
    };

    const restrictedBillingUser: AuthenticatedUser = {
      id: 'user-bill-2',
      name: 'Bikash 2',
      email: 'b2@trexobyte.com',
      roleName: 'Billing/Finance',
      isSuperAdmin: false,
      permissions: {
        ...getRoleDefaultGranularPermissions('Billing/Finance'),
        billing: { view: true, create: false, edit: false, delete: false, manage: false },
      },
    };

    // User 1 can manage payments
    expect(checkUserAction(fullBillingUser, 'billing', 'manage')).toBe(true);
    expect(checkUserAction(fullBillingUser, 'billing', 'delete')).toBe(true);

    // User 2 (same role) CANNOT manage payments or delete invoices because Super Admin customized their individual permissions
    expect(checkUserAction(restrictedBillingUser, 'billing', 'manage')).toBe(false);
    expect(checkUserAction(restrictedBillingUser, 'billing', 'delete')).toBe(false);
    expect(checkUserAction(restrictedBillingUser, 'billing', 'view')).toBe(true);
  });
});
