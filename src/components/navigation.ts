/**
 * Sidebar navigation data
 *
 * Kept apart from the component so the role filtering is plain, testable data:
 * which sections and items a given role sees, before any rendering happens.
 */

import {
  Building2,
  ChartNoAxesColumn,
  Clock,
  CreditCard,
  FileText,
  FolderKanban,
  Hash,
  LayoutDashboard,
  Layout,
  ListTodo,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  Timer,
  User,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import {
  PROJECT_FEATURE_KEYS,
  type Project,
  type ProjectFeature,
  type Role,
} from "@/lib/domain";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles: Role[];
  /** Set on a project row, so the sidebar can offer its feature picker. */
  projectId?: string;
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const EVERYONE: Role[] = ["owner", "admin", "manager", "member", "viewer", "guest"];
const ADMINS: Role[] = ["owner", "admin"];
const OWNERS: Role[] = ["owner"];
const REPORT_READERS: Role[] = ["owner", "admin", "manager", "member", "viewer"];
/** Roles holding `time.log` — the people who can actually record hours. */
const WORKERS: Role[] = ["owner", "admin", "manager", "member"];

/**
 * Static sections. Project entries are appended per request.
 *
 * Grouped by *who an entry is for*, which mirrors the permission matrix in
 * `lib/permissions.ts` rather than inventing a second idea of privilege:
 *
 *   Navigation     — the shared workspace. Everything here is `projects.view`
 *                    territory: every role sees the screens, and the controls
 *                    inside them light up per role (see `canCreate` on
 *                    ProjectsGrid, `canInvite` on UsersTable). "Team Members"
 *                    is here, not under Administration, because the roster is
 *                    something every role is meant to reach.
 *   Administration — the owner/admin surface: `workspace.settings`,
 *                    `roles.manage`, `billing.manage`. Managing the workspace,
 *                    not working inside it.
 *   Account        — facts about *you*, not privileges. Workspaces lives here
 *                    because belonging to several is a property of the user;
 *                    the switcher in the sidebar header serves everyone, and
 *                    this is the page behind it.
 *
 * Empty sections are dropped by `visibleSections`, so a member simply never
 * sees an Administration heading.
 */
function baseSections(): NavSection[] {
  return [
    {
      title: "Navigation",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: EVERYONE },
        { title: "All Projects", href: "/projects", icon: FolderKanban, roles: EVERYONE },
        { title: "Team Members", href: "/admin/users", icon: Users, roles: EVERYONE },
        { title: "Messages", href: "/messages", icon: MessageSquare, roles: EVERYONE },
        {
          title: "Analytics",
          href: "/projects/analytics",
          icon: ChartNoAxesColumn,
          roles: REPORT_READERS,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        // Same page as "Team Members" above, reached as management rather than
        // as the roster. `members.invite` is owner/admin, matching ADMINS.
        { title: "Users", href: "/admin/users", icon: UserCog, roles: ADMINS },
        { title: "Add User", href: "/admin/users/new", icon: UserPlus, roles: ADMINS },
        { title: "Teams", href: "/admin/teams", icon: UsersRound, roles: ADMINS },
        { title: "Roles", href: "/admin/users/roles", icon: ShieldCheck, roles: ADMINS },
        { title: "Settings", href: "/settings", icon: Settings, roles: ADMINS },
        // Owner-only, matching `billing.manage` — the one entry in the matrix
        // that admins do not hold.
        { title: "Billing", href: "/settings/billing", icon: CreditCard, roles: OWNERS },
      ],
    },
    {
      title: "Account",
      items: [
        { title: "Profile", href: "/profile", icon: User, roles: EVERYONE },
        { title: "Workspaces", href: "/workspaces", icon: Building2, roles: EVERYONE },
      ],
    },
  ];
}

/**
 * The sub-page each optional feature maps to. Keyed by `ProjectFeature`, so a
 * new feature key fails to compile here rather than silently rendering nothing.
 */
const FEATURE_ITEMS: Record<
  ProjectFeature,
  { title: string; segment: string; icon: NavItem["icon"]; roles: Role[] }
> = {
  tasks: { title: "Tasks", segment: "tasks", icon: ListTodo, roles: EVERYONE },
  campaigns: { title: "Campaigns", segment: "campaigns", icon: Megaphone, roles: EVERYONE },
  "landing-pages": {
    title: "Landing Pages",
    segment: "landing-pages",
    icon: Layout,
    roles: EVERYONE,
  },
  "time-tracking": {
    title: "Time Tracking",
    segment: "time-tracking",
    icon: Timer,
    // Logging time is `time.log`, which viewers and guests do not hold.
    roles: WORKERS,
  },
  timesheet: { title: "Timesheet", segment: "timesheet", icon: Clock, roles: EVERYONE },
  report: { title: "Report", segment: "report", icon: FileText, roles: REPORT_READERS },
};

/**
 * One entry per project, expanding to Overview plus whichever optional pages
 * that project has switched on. `projectId` marks these rows so the sidebar can
 * give them the "＋" feature picker instead of a plain expand chevron.
 */
function projectSection(
  projects: Pick<Project, "id" | "name" | "features">[],
): NavSection {
  return {
    title: "Projects",
    items: projects.map((project) => ({
      title: project.name,
      href: `/projects/project/${project.id}`,
      icon: Hash,
      roles: EVERYONE,
      projectId: project.id,
      children: [
        // Overview is the project itself, so it is never optional.
        {
          title: "Overview",
          href: `/projects/project/${project.id}`,
          icon: FolderKanban,
          roles: EVERYONE,
        },
        // Listed in PROJECT_FEATURES order rather than the stored order, so the
        // sidebar reads the same whichever order they were switched on.
        ...PROJECT_FEATURE_KEYS.filter((key) => project.features.includes(key)).map((key) => {
          const item = FEATURE_ITEMS[key];
          return {
            title: item.title,
            href: `/projects/project/${project.id}/${item.segment}`,
            icon: item.icon,
            roles: item.roles,
          };
        }),
      ],
    })),
  };
}

/**
 * Bottom tab bar shown below `lg` — the handful of destinations reached most
 * often, mirroring the sidebar's role rules.
 */
export const bottomTabItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: EVERYONE },
  { title: "Projects", href: "/projects", icon: FolderKanban, roles: EVERYONE },
  { title: "Tasks", href: "/projects/tasks", icon: ListTodo, roles: EVERYONE },
  { title: "Messages", href: "/messages", icon: MessageSquare, roles: EVERYONE },
  { title: "People", href: "/admin/users", icon: Users, roles: EVERYONE },
];

/** Tabs a role may see, with count badges merged in. */
export function visibleMobileTabs(
  role: Role,
  badges: Record<string, number> = {},
): NavItem[] {
  return bottomTabItems
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      badge: badges[item.href] ? String(badges[item.href]) : item.badge,
    }));
}

/**
 * Which tab a path belongs to.
 *
 * Prefix matching alone would light up both `/projects` and `/projects/tasks`
 * on the tasks page, so the longest matching href wins and only that one is
 * reported active.
 */
export function activeTabHref(pathname: string, tabs: NavItem[]): string | null {
  const matches = tabs.filter(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );
  if (matches.length === 0) return null;

  return matches.reduce((best, tab) => (tab.href.length > best.href.length ? tab : best)).href;
}

/**
 * The sections a role sees, with per-item and per-child role filtering applied
 * and count badges merged in. Empty sections are dropped.
 */
export function visibleSections(
  role: Role,
  projects: Pick<Project, "id" | "name" | "features">[],
  badges: Record<string, number> = {},
): NavSection[] {
  // Filter children as well as top-level items, so what this returns is exactly
  // what the role may see — the renderer never has to re-check.
  const prepare = (item: NavItem): NavItem => {
    const children = item.children
      ?.filter((child) => child.roles.includes(role))
      .map(prepare);

    return {
      ...item,
      badge: badges[item.href] ? String(badges[item.href]) : item.badge,
      children: children && children.length > 0 ? children : undefined,
    };
  };

  return [...baseSections(), projectSection(projects)]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)).map(prepare),
    }))
    .filter((section) => section.items.length > 0);
}
