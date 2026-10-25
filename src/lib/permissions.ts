export type ModulePermission = 'none' | 'view' | 'edit' | 'full';
export type ModulePermissionLevel = ModulePermission;

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage';

export type ERPModuleKey =
  | 'dashboard'
  | 'calendar'
  | 'clients'
  | 'tracker'
  | 'tasks'
  | 'billing'
  | 'users'
  | 'reports'
  | 'audit';

export interface PermissionsMap {
  [key: string]: ModulePermission | undefined;
  dashboard?: ModulePermission;
  calendar?: ModulePermission;
  clients?: ModulePermission;
  tracker?: ModulePermission;
  tasks?: ModulePermission;
  billing?: ModulePermission;
  reports?: ModulePermission;
  users?: ModulePermission;
  audit?: ModulePermission;
}

export type GranularModulePermissions = Partial<Record<PermissionAction, boolean>>;
export type GranularPermissionsMap = Record<string, GranularModulePermissions>;
export type UserPermissionsMap = Record<string, any>;

export interface ModuleActionDef {
  key: PermissionAction;
  label: string;
  description: string;
}

export interface ModuleDef {
  key: ERPModuleKey;
  label: string;
  description: string;
  actions: ModuleActionDef[];
}

export const ERP_MODULE_DEFINITIONS: ModuleDef[] = [
  {
    key: 'dashboard',
    label: 'Dashboard & Overview',
    description: 'Executive dashboard, active client metrics, and business KPIs',
    actions: [
      { key: 'view', label: 'View Dashboard', description: 'View dashboard overview and business statistics' },
    ],
  },
  {
    key: 'calendar',
    label: 'Planning & Calendar',
    description: 'Shoot schedules, content roadmap, and agency calendar events',
    actions: [
      { key: 'view', label: 'View Calendar', description: 'View scheduled shoots and calendar roadmap' },
      { key: 'create', label: 'Schedule Shoots', description: 'Create and schedule new calendar events or shoots' },
      { key: 'edit', label: 'Edit Events', description: 'Reschedule, adjust shoot times, and edit details' },
      { key: 'delete', label: 'Delete Events', description: 'Remove or cancel scheduled calendar events' },
    ],
  },
  {
    key: 'clients',
    label: 'Clients & Accounts',
    description: 'Brand profiles, retainers, tiers, and client servicing',
    actions: [
      { key: 'view', label: 'View Clients', description: 'View client records, retainers, and assigned teams' },
      { key: 'create', label: 'Create Clients', description: 'Onboard and register new brand accounts' },
      { key: 'edit', label: 'Edit Clients', description: 'Update packages, retainers, and account settings' },
      { key: 'delete', label: 'Delete Clients', description: 'Archive or remove client accounts' },
    ],
  },
  {
    key: 'tracker',
    label: 'Production Tracker',
    description: 'Kanban production pipeline, reels, carousels, and shoot deliverables',
    actions: [
      { key: 'view', label: 'View Pipeline', description: 'View content workflow stages and deliverables' },
      { key: 'create', label: 'Add Deliverables', description: 'Create new content tasks or production items' },
      { key: 'edit', label: 'Update Stages', description: 'Move stages, update editing status, and approve content' },
      { key: 'delete', label: 'Delete Deliverables', description: 'Remove content items from the pipeline' },
    ],
  },
  {
    key: 'tasks',
    label: 'Tasks & Urgency',
    description: 'Urgency-driven team task lists, assignments, and due dates',
    actions: [
      { key: 'view', label: 'View Tasks', description: 'View active task lists and deadlines' },
      { key: 'create', label: 'Create Tasks', description: 'Create new tasks and assign to team members' },
      { key: 'edit', label: 'Edit Tasks', description: 'Update task urgency, description, and status' },
      { key: 'delete', label: 'Delete Tasks', description: 'Delete task records' },
    ],
  },
  {
    key: 'billing',
    label: 'Billing & Invoices',
    description: 'Invoice generation, payment receipts, revenue tracking, and financial history',
    actions: [
      { key: 'view', label: 'View Invoices', description: 'View invoice list, pricing, and revenue summaries' },
      { key: 'create', label: 'Create Invoices', description: 'Generate and send new billing invoices' },
      { key: 'edit', label: 'Edit Invoices', description: 'Modify billing periods, amounts, and notes' },
      { key: 'delete', label: 'Delete Invoices', description: 'Cancel or delete invoice records' },
      { key: 'manage', label: 'Manage Payments', description: 'Record payments received and mark invoices paid' },
    ],
  },
  {
    key: 'users',
    label: 'Team & User Management',
    description: 'Team member directory, role assignment, and access controls',
    actions: [
      { key: 'view', label: 'View Team', description: 'View team member directory and assigned roles' },
      { key: 'create', label: 'Create Members', description: 'Add new team members and set initial access' },
      { key: 'edit', label: 'Edit Members', description: 'Update profile details, role, and permissions' },
      { key: 'delete', label: 'Delete Members', description: 'Deactivate or delete user accounts' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    description: 'Cross-client reporting, workload analytics, and performance insights',
    actions: [
      { key: 'view', label: 'View Reports', description: 'Access reporting summaries and export analytics' },
    ],
  },
  {
    key: 'audit',
    label: 'Audit Logs & Rollback',
    description: 'Complete system audit trail and 1-click restore/undo capabilities',
    actions: [
      { key: 'view', label: 'View Audit Logs', description: 'View change logs, edit history, and actor details' },
      { key: 'manage', label: 'Undo & Rollback', description: 'Revert changes and rollback supported modifications' },
    ],
  },
];

export const ROLE_PERMISSIONS_PRESETS: Record<string, PermissionsMap> = {
  'Super Admin': {
    dashboard: 'full',
    calendar: 'full',
    clients: 'full',
    tracker: 'full',
    tasks: 'full',
    billing: 'full',
    reports: 'full',
    users: 'full',
    audit: 'full',
  },
  Manager: {
    dashboard: 'full',
    calendar: 'full',
    clients: 'edit',
    tracker: 'full',
    tasks: 'full',
    billing: 'view',
    reports: 'full',
    users: 'view',
    audit: 'view',
  },
  'Social Media Manager': {
    dashboard: 'view',
    calendar: 'edit',
    clients: 'view',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
    audit: 'none',
  },
  'Content/Shoot Manager': {
    dashboard: 'view',
    calendar: 'full',
    clients: 'view',
    tracker: 'full',
    tasks: 'full',
    billing: 'none',
    reports: 'view',
    users: 'none',
    audit: 'none',
  },
  'Ads Manager': {
    dashboard: 'view',
    calendar: 'edit',
    clients: 'view',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
    audit: 'none',
  },
  'Client Communication': {
    dashboard: 'view',
    calendar: 'view',
    clients: 'edit',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
    audit: 'none',
  },
  'Billing/Finance': {
    dashboard: 'view',
    calendar: 'view',
    clients: 'view',
    tracker: 'view',
    tasks: 'view',
    billing: 'full',
    reports: 'full',
    users: 'none',
    audit: 'none',
  },
  'Lead Creator & Videographer': {
    dashboard: 'view',
    calendar: 'full',
    clients: 'view',
    tracker: 'full',
    tasks: 'full',
    billing: 'none',
    reports: 'none',
    users: 'none',
    audit: 'none',
  },
  Viewer: {
    dashboard: 'view',
    calendar: 'view',
    clients: 'view',
    tracker: 'view',
    tasks: 'view',
    billing: 'none',
    reports: 'none',
    users: 'none',
    audit: 'none',
  },
};

export function levelToActions(level: ModulePermission = 'none'): Record<PermissionAction, boolean> {
  switch (level) {
    case 'full':
      return { view: true, create: true, edit: true, delete: true, manage: true };
    case 'edit':
      return { view: true, create: true, edit: true, delete: false, manage: false };
    case 'view':
      return { view: true, create: false, edit: false, delete: false, manage: false };
    case 'none':
    default:
      return { view: false, create: false, edit: false, delete: false, manage: false };
  }
}

export function actionsToLevel(actions: Partial<Record<PermissionAction, boolean>> = {}): ModulePermission {
  if (actions.delete || actions.manage) return 'full';
  if (actions.edit || actions.create) return 'edit';
  if (actions.view) return 'view';
  return 'none';
}

export function parsePermissions(jsonString?: string | null | any): UserPermissionsMap {
  if (!jsonString) return {};
  if (typeof jsonString === 'object') return jsonString;
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch (e) {
    return {};
  }
}

export function getRoleDefaultGranularPermissions(
  roleNameOrPerms?: string | PermissionsMap | null
): GranularPermissionsMap {
  let baseMap: PermissionsMap = {};

  if (typeof roleNameOrPerms === 'string') {
    if (ROLE_PERMISSIONS_PRESETS[roleNameOrPerms]) {
      baseMap = ROLE_PERMISSIONS_PRESETS[roleNameOrPerms];
    } else {
      try {
        const parsed = JSON.parse(roleNameOrPerms);
        baseMap = typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch {
        baseMap = ROLE_PERMISSIONS_PRESETS['Social Media Manager'];
      }
    }
  } else if (roleNameOrPerms && typeof roleNameOrPerms === 'object') {
    baseMap = roleNameOrPerms as PermissionsMap;
  } else {
    baseMap = ROLE_PERMISSIONS_PRESETS['Social Media Manager'];
  }

  const result: GranularPermissionsMap = {};
  for (const mod of ERP_MODULE_DEFINITIONS) {
    const rawVal = (baseMap as any)[mod.key];
    if (typeof rawVal === 'object' && rawVal !== null) {
      const actionsObj: Partial<Record<PermissionAction, boolean>> = {};
      for (const act of mod.actions) {
        actionsObj[act.key] = Boolean(rawVal[act.key]);
      }
      result[mod.key] = actionsObj;
    } else {
      const level = (rawVal as ModulePermission) || 'none';
      const actionDefaults = levelToActions(level);
      const actionsObj: Partial<Record<PermissionAction, boolean>> = {};
      for (const act of mod.actions) {
        actionsObj[act.key] = Boolean(actionDefaults[act.key]);
      }
      result[mod.key] = actionsObj;
    }
  }
  return result;
}

export function normalizeUserPermissions(
  permissions: UserPermissionsMap | string | null | undefined,
  fallbackRoleName?: string | null
): GranularPermissionsMap {
  const parsed = typeof permissions === 'string' ? parsePermissions(permissions) : permissions || {};
  const hasKeys = Object.keys(parsed).length > 0;

  if (!hasKeys && fallbackRoleName) {
    return getRoleDefaultGranularPermissions(fallbackRoleName);
  }

  const result: GranularPermissionsMap = {};
  for (const mod of ERP_MODULE_DEFINITIONS) {
    const rawVal = parsed[mod.key];
    const actionsObj: Partial<Record<PermissionAction, boolean>> = {};

    if (typeof rawVal === 'object' && rawVal !== null) {
      for (const act of mod.actions) {
        actionsObj[act.key] = Boolean(rawVal[act.key]);
      }
    } else if (typeof rawVal === 'string') {
      const actionDefaults = levelToActions(rawVal as ModulePermission);
      for (const act of mod.actions) {
        actionsObj[act.key] = Boolean(actionDefaults[act.key]);
      }
    } else {
      for (const act of mod.actions) {
        actionsObj[act.key] = false;
      }
    }
    result[mod.key] = actionsObj;
  }
  return result;
}

export function hasPermission(
  permissions: UserPermissionsMap | string | undefined | null,
  module: keyof PermissionsMap | string,
  requiredLevel: ModulePermission = 'view'
): boolean {
  if (requiredLevel === 'none') return true;

  const map = typeof permissions === 'string' ? parsePermissions(permissions) : permissions || {};
  const val = map[module];
  if (!val) return false;

  const levelHierarchy: Record<ModulePermission, number> = {
    none: 0,
    view: 1,
    edit: 2,
    full: 3,
  };

  if (typeof val === 'string') {
    const userLevel = (val as ModulePermission) || 'none';
    return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel];
  }

  if (typeof val === 'object' && val !== null) {
    if (requiredLevel === 'view') {
      return Boolean(val.view || val.create || val.edit || val.delete || val.manage);
    }
    if (requiredLevel === 'edit') {
      return Boolean(val.edit || val.create || val.delete || val.manage);
    }
    if (requiredLevel === 'full') {
      return Boolean(val.delete || val.manage);
    }
  }

  return false;
}

export function hasActionPermission(
  permissions: UserPermissionsMap | string | undefined | null,
  module: ERPModuleKey | string,
  action: PermissionAction = 'view'
): boolean {
  const map = typeof permissions === 'string' ? parsePermissions(permissions) : permissions || {};
  const val = map[module];
  if (!val) return false;

  if (typeof val === 'object' && val !== null) {
    if (val[action] !== undefined) {
      return Boolean(val[action]);
    }
    if (Boolean((val as any).manage) && action === 'manage') return true;
    if (Boolean((val as any).full)) return true;
    return false;
  }

  if (typeof val === 'string') {
    const actions = levelToActions(val as ModulePermission);
    return Boolean(actions[action]);
  }

  return false;
}

export function countActivePermissions(permissions: GranularPermissionsMap | UserPermissionsMap | string | null | undefined): {
  enabled: number;
  total: number;
} {
  const normalized = normalizeUserPermissions(permissions as any);
  let enabled = 0;
  let total = 0;

  for (const mod of ERP_MODULE_DEFINITIONS) {
    for (const act of mod.actions) {
      total += 1;
      if (normalized[mod.key]?.[act.key]) {
        enabled += 1;
      }
    }
  }

  return { enabled, total };
}
