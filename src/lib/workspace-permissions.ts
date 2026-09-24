/**
 * Workspace Permission Matrix
 * 
 * Maps workspace roles to granular permissions for module-level access control.
 * This is the single source of truth for what each role can do.
 */

export type WorkspaceRole = 
  | 'viewer'
  | 'inventory_clerk'
  | 'safety_manager'
  | 'supervisor'
  | 'workspace_admin';

export type WorkspacePermission =
  // Dashboard
  | 'view_dashboard'
  // Assets
  | 'view_assets'
  | 'create_assets'
  | 'edit_assets'
  | 'delete_assets'
  // Containers
  | 'view_containers'
  | 'manage_containers'
  // Check in/out
  | 'check_in_out'
  // Team
  | 'view_team'
  | 'manage_team'
  // Credentials & Compliance
  | 'view_credentials'
  | 'manage_credentials'
  | 'view_compliance'
  // Pallet Builder
  | 'use_pallet_builder'
  // Calendar
  | 'use_calendar'
  // Settings
  | 'manage_settings'
  | 'assign_roles';

/** Nav modules that can be hidden based on permissions */
export type NavModule =
  | 'dashboard'
  | 'inventory'
  | 'people'
  | 'calendar'
  | 'pallet-builder'
  | 'settings'
  | 'billing';

const PERMISSION_MATRIX: Record<WorkspaceRole, Set<WorkspacePermission>> = {
  viewer: new Set([
    'view_dashboard',
    'view_assets',
    'view_team',
  ]),

  inventory_clerk: new Set([
    'view_dashboard',
    'view_assets',
    'create_assets',
    'edit_assets',
    'delete_assets',
    'view_containers',
    'manage_containers',
    'check_in_out',
  ]),

  safety_manager: new Set([
    'view_dashboard',
    'view_team',
    'view_credentials',
    'manage_credentials',
    'view_compliance',
  ]),

  supervisor: new Set([
    'view_dashboard',
    'view_assets',
    'create_assets',
    'edit_assets',
    'delete_assets',
    'view_containers',
    'manage_containers',
    'check_in_out',
    'view_credentials',
    'manage_credentials',
    'use_pallet_builder',
    'use_calendar',
  ]),

  workspace_admin: new Set([
    'view_dashboard',
    'view_assets',
    'create_assets',
    'edit_assets',
    'delete_assets',
    'view_containers',
    'manage_containers',
    'check_in_out',
    'view_team',
    'manage_team',
    'view_credentials',
    'manage_credentials',
    'view_compliance',
    'use_pallet_builder',
    'use_calendar',
    'manage_settings',
    'assign_roles',
  ]),
};

/** Check if a role has a specific permission */
export function roleHasPermission(role: WorkspaceRole, permission: WorkspacePermission): boolean {
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}

/** Get all permissions for a role */
export function getRolePermissions(role: WorkspaceRole): Set<WorkspacePermission> {
  return PERMISSION_MATRIX[role] ?? new Set();
}

/** Map nav modules to the permissions required to see them */
const NAV_MODULE_PERMISSIONS: Record<NavModule, WorkspacePermission> = {
  dashboard: 'view_dashboard',
  inventory: 'view_assets',
  people: 'view_team',
  calendar: 'use_calendar',
  'pallet-builder': 'use_pallet_builder',
  settings: 'manage_settings',
  billing: 'manage_settings',
};

/** Check if a role can see a nav module */
export function roleCanSeeModule(role: WorkspaceRole, module: NavModule): boolean {
  const required = NAV_MODULE_PERMISSIONS[module];
  if (!required) return true;
  return roleHasPermission(role, required);
}

/** Human-readable labels for workspace roles */
export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  viewer: 'Viewer',
  inventory_clerk: 'Inventory Clerk',
  safety_manager: 'Safety Manager',
  supervisor: 'Supervisor',
  workspace_admin: 'Workspace Admin',
};

/** Descriptions for each role */
export const WORKSPACE_ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  viewer: 'View dashboard, assets, and team members. Cannot create or edit records.',
  inventory_clerk: 'Create and edit assets, manage containers, check assets in/out. Cannot manage team.',
  safety_manager: 'View team, manage credentials, compliance alerts, and certifications. Cannot edit assets.',
  supervisor: 'Manage assets, containers, pallet builder, credentials, and calendar. Cannot manage settings.',
  workspace_admin: 'Full control of the workspace including user management and settings.',
};
