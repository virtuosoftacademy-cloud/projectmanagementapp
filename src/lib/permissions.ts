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
  "projects.view": ["admin", "manager", "member", "viewer", "guest"],
  "projects.create": ["admin", "manager", "member"],
  "projects.edit": ["admin", "manager", "member"],
  "projects.delete": ["admin"],
  "tasks.manage": ["admin", "manager", "member"],
  "time.log": ["admin", "manager", "member"],
  // Correcting or removing *other people's* time entries. Everyone may fix
  // their own; changing someone else's is a supervisory act, and it moves what
  // the reports and invoices say.
  "time.manage": ["admin", "manager"],
  "reports.view": ["admin", "manager", "member", "viewer"],
  "members.invite": ["admin"],
  // Granting and changing what someone may do, matching who
  // may add a user in the first place.
  "roles.manage": ["admin"],
  // Permanently deleting an account is not a permission change: it destroys
  // their time entries and task history, so it stays with admins.
  "members.delete": ["admin"],
  "workspace.create": ["admin"],
  "workspace.settings": ["admin"],
  // Deleting a workspace destroys everything inside it, so it sits with the
  // admin — and the action additionally requires admin of the *target*
  // workspace, not merely of the one the session is currently in.
  "workspace.delete": ["admin"],
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
  "time.manage": "Edit anyone's time entries",
  "reports.view": "View reports",
  "members.invite": "Invite members",
  "roles.manage": "Manage roles & permissions",
  "members.delete": "Delete accounts",
  "workspace.create": "Create workspaces",
  "workspace.settings": "Workspace settings",
  "workspace.delete": "Delete workspaces",
};

export const ROLES: Role[] = ["admin", "manager", "member", "viewer", "guest"];

/**
 * The one role that cannot be edited or deleted.
 *
 * Admin is the workspace's floor. It is the only role holding `roles.manage`
 * that cannot itself be edited, and the last-admin guards mean a workspace
 * always keeps one — so there is always somebody who can restore any other
 * role that was edited or deleted by mistake.
 *
 * Every other role is a `CustomRole` row: editable, deletable, and bounded by
 * the base role it inherits from. The enum values still exist as those
 * ceilings, but they are no longer roles you hold directly.
 */
export const FIXED_ROLES: Role[] = ["admin"];

export function isFixedRole(role: string): boolean {
  return (FIXED_ROLES as string[]).includes(role);
}

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

/** `admin` -> `Admin`, for display. */
export function roleLabel(role: Role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// ============================================================================
// PER-USER PAGE ACCESS
// ============================================================================

/**
 * The assignable pages, keyed to the permission each one's gate already
 * enforces (see the `requirePermission` call in the matching `page.tsx`).
 *
 * `permission: null` marks a page every role may reach — the gate there is
 * `requireUser`, and the controls inside are gated individually.
 *
 * Project sub-pages are deliberately absent: those are per-*project* features
 * on `Project.features`, not per-user, and mixing the two would give one page
 * two different owners.
 */
export const APP_PAGES = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", permission: null },
  { key: "projects", label: "All Projects", href: "/projects", permission: null },
  { key: "tasks", label: "Tasks", href: "/projects/tasks", permission: null },
  { key: "calendar", label: "Calendar", href: "/projects/calendar", permission: null },
  { key: "team-members", label: "Team Members", href: "/team-members", permission: null },
  { key: "messages", label: "Messages", href: "/messages", permission: null },
  {
    key: "analytics",
    label: "Analytics",
    href: "/projects/analytics",
    permission: "reports.view",
  },
  {
    key: "time-tracking",
    label: "Time Tracking",
    href: "/projects/time-tracking",
    permission: "time.log",
  },
  {
    key: "timesheet",
    label: "Timesheet",
    href: "/projects/timesheet",
    permission: "time.log",
  },
  { key: "users", label: "Users", href: "/admin/users", permission: "members.invite" },
  { key: "teams", label: "Teams", href: "/admin/teams", permission: "workspace.settings" },
  { key: "roles", label: "Roles", href: "/admin/users/roles", permission: "workspace.settings" },
  { key: "settings", label: "Settings", href: "/settings", permission: "workspace.settings" },
  { key: "profile", label: "Profile", href: "/profile", permission: null },
  {
    key: "appearance",
    label: "Display & Appearance",
    href: "/settings/appearance",
    permission: null,
  },
  { key: "workspaces", label: "Workspaces", href: "/workspaces", permission: null },
] as const satisfies readonly {
  key: string;
  label: string;
  href: string;
  permission: Permission | null;
}[];

export type AppPage = (typeof APP_PAGES)[number]["key"];

export const APP_PAGE_KEYS = APP_PAGES.map((page) => page.key) as AppPage[];

/** Every page a role could reach on its permissions alone, before assignment. */
export function pagesForRole(role: Role): AppPage[] {
  return pagesForPermissions(permissionsFor(role));
}

/**
 * The same, from an explicit permission set.
 *
 * A custom role holds a *narrowed* subset of its base role, so its pages have
 * to be derived from that subset rather than from the base role — otherwise
 * removing `reports.view` from a custom role would still leave Analytics
 * reachable.
 */
export function pagesForPermissions(permissions: readonly Permission[]): AppPage[] {
  return APP_PAGES.filter(
    (page) => page.permission === null || permissions.includes(page.permission),
  ).map((page) => page.key);
}

/**
 * The pages a member may actually reach.
 *
 * `assigned` is `WorkspaceMember.pages`: null means "never configured", and the
 * role's own pages apply unchanged — so adding this feature took nothing away
 * from anyone.
 *
 * **Assignment only ever narrows.** The result is the intersection with what
 * the role already allows, never a union. Granting a viewer the Billing page
 * would otherwise show them a screen whose every control and server action
 * still refuses them, because those check the permission matrix directly.
 * Widening access is a role change, which is what `roles.manage` is for.
 */
export function resolvePages(role: Role, assigned: readonly string[] | null): AppPage[] {
  return narrowPages(pagesForRole(role), assigned);
}

/** `resolvePages` from an already-resolved page ceiling. */
export function narrowPages(
  allowed: readonly AppPage[],
  assigned: readonly string[] | null,
): AppPage[] {
  if (assigned === null) return [...allowed];

  const set = new Set(assigned);
  return allowed.filter((page) => set.has(page));
}

/** Whether a member may reach one page, given their role and assignment. */
export function canReachPage(
  role: Role | undefined | null,
  assigned: readonly string[] | null,
  page: AppPage,
): boolean {
  if (!role) return false;
  return resolvePages(role, assigned).includes(page);
}

// ============================================================================
// ROLE RESOLUTION (pure — the database-backed half lives in resolve-role.ts)
// ============================================================================

export type ResolvedRole = {
  /** The base role every role-based check should use. */
  effectiveRole: Role;
  permissions: Permission[];
  isCustom: boolean;
  /** Present only for a custom role — for display and for the roles screen. */
  customRole: { id: string; name: string; label: string } | null;
};

/** Whether a name is one of the built-in roles rather than a custom one. */
export function isBaseRole(name: string): name is Role {
  return (ROLES as string[]).includes(name);
}

/** A base role resolved from the matrix alone — no query, no custom row. */
export function resolveBaseRole(role: Role): ResolvedRole {
  return {
    effectiveRole: role,
    permissions: permissionsFor(role),
    isCustom: false,
    customRole: null,
  };
}

/**
 * Shapes a stored custom role into a `ResolvedRole`, applying its ceiling.
 *
 * The permissions returned are the **intersection** with what `inheritsFrom`
 * grants, not the stored list. Enforcing it here rather than trusting the row
 * means a permission that was valid when the role was saved, and later removed
 * from its base role, stops applying immediately — and a hand-edited database
 * row cannot grant more than the base role ever could.
 */
export function resolveCustomRole(row: {
  id: string;
  name: string;
  label: string;
  permissions: unknown;
  inheritsFrom: Role;
}): ResolvedRole {
  const stored = Array.isArray(row.permissions) ? (row.permissions as string[]) : [];
  const ceiling = permissionsFor(row.inheritsFrom);

  return {
    effectiveRole: row.inheritsFrom,
    permissions: ceiling.filter((permission) => stored.includes(permission)),
    isCustom: true,
    customRole: { id: row.id, name: row.name, label: row.label },
  };
}
