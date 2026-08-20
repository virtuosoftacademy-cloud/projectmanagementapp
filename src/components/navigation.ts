/**
 * Sidebar navigation data
 *
 * Kept apart from the component so the role filtering is plain, testable data:
 * which sections and items a given role sees, before any rendering happens.
 */

import {
  ChartNoAxesColumn,
  Clock,
  FileText,
  FolderKanban,
  Hash,
  LayoutDashboard,
  // Layout, // only used by the commented-out "Landing Pages" nav entry below
  ListTodo,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Users,
  UsersRound,
} from "lucide-react";
import type { Project, Role } from "@/lib/domain";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles: Role[];
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const EVERYONE: Role[] = ["owner", "admin", "manager", "member", "viewer", "guest"];
const ADMINS: Role[] = ["owner", "admin"];
const REPORT_READERS: Role[] = ["owner", "admin", "manager", "member", "viewer"];

/**
 * Static sections. Project entries are appended per request.
 *
 * Flat, single-group layout matching the original Lovable reference
 * (team-hug-30.lovable.app) — one "Navigation" list rather than the
 * Workspace/Administration/Account split this sidebar used before.
 * Two deliberate departures from that reference, both to fit the real
 * auth/RBAC this app has that the prototype didn't:
 *   - "Team Members" stays visible to every role, not admin-only, per this
 *     app's own earlier requirement that non-admins can reach the roster.
 *   - "Roles" has no equivalent in the reference; kept since the page it
 *     points to is real and has no other way in.
 */
function baseSections(): NavSection[] {
  return [
    {
      title: "Navigation",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: EVERYONE },
        { title: "Team Members", href: "/admin/users", icon: Users, roles: EVERYONE },
        { title: "Teams", href: "/admin/teams", icon: UsersRound, roles: ADMINS },
        { title: "Roles", href: "/admin/users/roles", icon: ShieldCheck, roles: ADMINS },
        { title: "Messages", href: "/messages", icon: MessageSquare, roles: EVERYONE },
        { title: "All Projects", href: "/projects", icon: FolderKanban, roles: EVERYONE },
        {
          title: "Analytics",
          href: "/projects/analytics",
          icon: ChartNoAxesColumn,
          roles: REPORT_READERS,
        },
        { title: "Profile", href: "/profile", icon: User, roles: EVERYONE },
        { title: "Settings", href: "/settings", icon: Settings, roles: ADMINS },
      ],
    },
  ];
}

/** One entry per project, each expanding to its own sub-pages. */
function projectSection(projects: Pick<Project, "id" | "name">[]): NavSection {
  return {
    title: "Projects",
    items: projects.map((project) => ({
      title: project.name,
      href: `/projects/project/${project.id}`,
      icon: Hash,
      roles: EVERYONE,
      children: [
        {
          title: "Overview",
          href: `/projects/project/${project.id}`,
          icon: FolderKanban,
          roles: EVERYONE,
        },
        {
          title: "Tasks",
          href: `/projects/project/${project.id}/tasks`,
          icon: ListTodo,
          roles: EVERYONE,
        },
        {
          title: "Campaigns",
          href: `/projects/project/${project.id}/campaigns`,
          icon: Megaphone,
          roles: EVERYONE,
        },
        // {
        //   title: "Landing Pages",
        //   href: `/projects/project/${project.id}/landing-pages`,
        //   icon: Layout,
        //   roles: EVERYONE,
        // },
        {
          title: "Timesheet",
          href: `/projects/project/${project.id}/timesheet`,
          icon: Clock,
          roles: EVERYONE,
        },
        {
          title: "Report",
          href: `/projects/project/${project.id}/report`,
          icon: FileText,
          roles: REPORT_READERS,
        },
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
  projects: Pick<Project, "id" | "name">[],
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
