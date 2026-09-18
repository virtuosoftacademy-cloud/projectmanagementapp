/**
 * Sidebar navigation data
 *
 * Kept apart from the component so the role filtering is plain, testable data:
 * which sections and items a given role sees, before any rendering happens.
 */

import {
  Building2,
  Clock,
  FileText,
  FolderKanban,
  Hash,
  LayoutDashboard,
  Layout,
  Palette,
  ListTodo,
  Megaphone,
  MessageSquare,
  Sheet,
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
import { APP_PAGES, type AppPage } from "@/lib/permissions";

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
const REPORT_READERS: Role[] = ["owner", "admin", "manager", "member", "viewer"];
/** Roles holding `time.log` — the people who can actually record hours. */
const WORKERS: Role[] = ["owner", "admin", "manager", "member"];

/**
 * Static sections. Project entries are appended per request.
 *
 * Grouped by *who an entry is for*, which mirrors the permission matrix in
 * `lib/permissions.ts` rather than inventing a second idea of privilege:
 *
 *   Navigation     — the daily work surface: what you are doing and where your
 *                    hours went.
 *   Team Members   — the people side: the roster, talking to them, and the
 *                    teams they belong to.
 *   Administration — managing the workspace rather than working inside it:
 *                    accounts, roles and the workspaces themselves.
 *   Settings       — how the app behaves for *you*. No permission attaches to
 *                    either entry; the theme is stored per browser.
 *
 * Empty sections are dropped by `visibleSections`, so a member simply never
 * sees an Administration heading.
 *
 * Reachable only by URL, deliberately rather than by oversight: `/settings`
 * (workspace settings), `/projects/analytics`, and `/projects/time-tracking`
 * — the last because time is now reached per project or through Timesheet.
 */
function baseSections(): NavSection[] {
  return [
    {
      title: "Navigation",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: EVERYONE },
        { title: "All Projects", href: "/projects", icon: FolderKanban, roles: EVERYONE },
        // The workspace-wide weekly grid — every project you are on, in one
        // sheet. Time Tracking is still reachable per project; it is no longer
        // duplicated as a workspace-level entry here.
        {
          title: "Timesheet",
          href: "/projects/timesheet",
          icon: Clock,
          roles: WORKERS,
        },
      ],
    },
    {
      title: "Team Members",
      items: [
        // The roster of people in this workspace — everyone may see it.
        { title: "Teams", href: "/team-members", icon: Users, roles: EVERYONE },
        { title: "Messages", href: "/messages", icon: MessageSquare, roles: EVERYONE },
        // Managing the teams themselves. Sits with the people group rather than
        // under Administration, since that is what it is about.
        { title: "All Teams", href: "/admin/teams", icon: UsersRound, roles: ADMINS },
      ],
    },
    {
      title: "Administration",
      items: [
        // The directory of *every* account, including people who are not in
        // this workspace yet, so an admin can find someone to add.
        // `members.invite` is owner/admin, matching ADMINS.
        { title: "Users", href: "/admin/users", icon: UserCog, roles: ADMINS },
        { title: "Add Users", href: "/admin/users/new", icon: UserPlus, roles: ADMINS },
        { title: "Roles", href: "/admin/users/roles", icon: ShieldCheck, roles: ADMINS },
        // ADMINS, not EVERYONE. As EVERYONE it was the only item a member could
        // see here, so they got an "Administration" heading with one entry
        // under it. Switching workspaces is still available to every role
        // through the switcher at the top of the sidebar.
        { title: "Workspaces", href: "/workspaces", icon: Building2, roles: ADMINS },
      ],
    },
    {
      title: "Settings",
      items: [
        { title: "Profile", href: "/profile", icon: User, roles: EVERYONE },
        {
          title: "Display & Appearance",
          href: "/settings/appearance",
          icon: Palette,
          roles: EVERYONE,
        },
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
  // Still typed, but absent from PROJECT_FEATURES — so it is never offered in
  // the picker and never appears in the nav. The route remains reachable by URL
  // for any project that already had it stored.
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
  // Still typed, but absent from PROJECT_FEATURES — never offered in the
  // picker and never shown in the nav. The route stays reachable by URL for
  // any project that already had it stored.
  timesheet: { title: "Timesheet", segment: "timesheet", icon: Clock, roles: EVERYONE },
  spreadsheet: {
    title: "Spreadsheets",
    segment: "spreadsheet",
    icon: Sheet,
    roles: EVERYONE,
  },
  report: { title: "Reports", segment: "report", icon: FileText, roles: REPORT_READERS },
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
  { title: "People", href: "/team-members", icon: Users, roles: EVERYONE },
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
  /**
   * Pages this member may reach, from `resolvePages`. Omitted means "no
   * per-user restriction", which is what every caller wanted before page
   * assignment existed — so passing nothing keeps the old behaviour.
   *
   * Matching is by href: an entry whose href is in `APP_PAGES` but not in this
   * list is dropped, so the sidebar never offers a link that would bounce the
   * member to /forbidden. Project sub-pages carry no page key and are governed
   * by `Project.features` instead, so they pass through untouched.
   */
  pages?: readonly AppPage[],
): NavSection[] {
  const blockedHrefs =
    pages === undefined
      ? new Set<string>()
      : new Set(
          APP_PAGES.filter((page) => !pages.includes(page.key)).map((page) => page.href),
        );

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
      items: section.items
        .filter((item) => item.roles.includes(role) && !blockedHrefs.has(item.href))
        .map(prepare),
    }))
    .filter((section) => section.items.length > 0);
}
