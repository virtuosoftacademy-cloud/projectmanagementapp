import { type Role } from "@/lib/domain";

/**
 * The permission matrix rendered on /settings, in machine-readable form. This
 * is the single source of truth for authorization: the settings table and every
 * `can()` check read from it.
 *
 * Roles use the app's lowercase vocabulary; `lib/session.ts` converts the
 * database enum once, at the session boundary.
 */
export const PERMISSIONS = {
  "projects.view": ["owner", "admin", "manager", "member", "viewer", "guest"],
  "projects.create": ["owner", "admin", "manager", "member"],
  "projects.edit": ["owner", "admin", "manager", "member"],
  "projects.delete": ["owner", "admin"],
  "tasks.manage": ["owner", "admin", "manager", "member"],
  "time.log": ["owner", "admin", "manager", "member"],
  "reports.view": ["owner", "admin", "manager", "member", "viewer"],
  "members.invite": ["owner", "admin"],
  "roles.manage": ["owner"],
  "workspace.settings": ["owner", "admin"],
  "billing.manage": ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Human labels, in the order the settings table lists them. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "projects.view": "View projects",
  "projects.create": "Create projects",
  "projects.edit": "Edit projects",
  "projects.delete": "Delete projects",
  "tasks.manage": "Manage tasks",
  "time.log": "Log time",
  "reports.view": "View reports",
  "members.invite": "Invite members",
  "roles.manage": "Manage roles",
  "workspace.settings": "Workspace settings",
  "billing.manage": "Billing & plans",
};

export const ROLES: Role[] = ["owner", "admin", "manager", "member", "viewer", "guest"];

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

/** Whether a role is granted a permission. */
export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Every permission a role holds — handy for passing a set to client components. */
export function permissionsFor(role: Role): Permission[] {
  return PERMISSION_KEYS.filter((permission) => can(role, permission));
}

/** `owner` -> `Owner`, for display. */
export function roleLabel(role: Role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
