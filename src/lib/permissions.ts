export type ModulePermission = 'none' | 'view' | 'edit' | 'full';

export interface PermissionsMap {
  dashboard?: ModulePermission;
  calendar?: ModulePermission;
  clients?: ModulePermission;
  tracker?: ModulePermission;
  tasks?: ModulePermission;
  billing?: ModulePermission;
  reports?: ModulePermission;
  users?: ModulePermission;
}

export function parsePermissions(jsonString?: string | null): PermissionsMap {
  if (!jsonString) return {};
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return {};
  }
}

export function hasPermission(
  permissions: PermissionsMap | string | undefined | null,
  module: keyof PermissionsMap,
  requiredLevel: ModulePermission = 'view'
): boolean {
  const map = typeof permissions === 'string' ? parsePermissions(permissions) : permissions || {};
  const userLevel = map[module] || 'none';

  const levelHierarchy: Record<ModulePermission, number> = {
    none: 0,
    view: 1,
    edit: 2,
    full: 3,
  };

  return levelHierarchy[userLevel] >= levelHierarchy[requiredLevel];
}
