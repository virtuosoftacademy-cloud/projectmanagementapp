/**
 * Domain types, constants and pure helpers shared by server and client code.
 *
 * Everything here is data-source agnostic — no Prisma, no I/O — so client
 * components can import it freely. Reads live in `lib/queries.ts`, writes in
 * `lib/actions.ts`.
 *
 * The app speaks lowercase, hyphenated statuses (`"in-progress"`) while the
 * database uses Prisma enums (`IN_PROGRESS`). The query layer translates at the
 * boundary, so nothing in the UI needs to know about the storage format.
 */

export type Role = "owner" | "admin" | "manager" | "member" | "viewer" | "guest";
export type ProjectStatus = "active" | "planning" | "on-hold" | "completed";
export type TaskStatus = "todo" | "in-progress" | "in-review" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";
export type CampaignStatus = "active" | "draft" | "paused" | "completed";
export type SectionType =
  | "hero"
  | "features"
  | "cta"
  | "testimonials"
  | "gallery"
  | "newsletter"
  | "faq";

/**
 * The optional sub-pages a project can switch on. Overview is not here — it is
 * the project itself and is always present.
 *
 * A key is persisted on `Project.features`, so renaming one is a migration.
 */
export type ProjectFeature =
  | "tasks"
  | "campaigns"
  | "landing-pages"
  | "time-tracking"
  | "timesheet"
  | "report";

/** The minimum needed to render someone: avatar, name, link. */
export type Person = {
  id: string;
  name: string;
  email: string;
};

export type Member = Person & {
  role: Role;
  teamId: string | null;
  designation: string | null;
  hourlyRate: number;
  monthlyHours: number;
  disabled: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

/** A workspace as it appears in the switcher — with the caller's role in it. */
export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: Role;
};

export type Team = {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  color: string;
  leadId: string | null;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  teamId: string | null;
  startDate: string | null;
  endDate: string | null;
  defaultBillable: boolean;
  /** Which optional sub-pages this project has switched on. */
  features: ProjectFeature[];
  members: Person[];
};

export type Task = {
  id: string;
  title: string;
  projectId: string;
  status: TaskStatus;
  priority: Priority;
  assignees: Person[];
  estimateHours: number;
  billable: boolean;
  dueDate: string | null;
  subtasksTotal: number;
  subtasksDone: number;
};

export type TimeEntry = {
  id: string;
  date: string;
  userId: string;
  taskId: string;
  hours: number;
  billable: boolean;
  note: string;
};

export type Campaign = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: CampaignStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  budget: number;
};

export type LandingSection = {
  id: string;
  projectId: string;
  type: SectionType;
  heading: string;
  subheading: string | null;
  items: string[] | null;
  primaryCta: string | null;
  secondaryCta: string | null;
  position: number;
};

export type ActivityEntry = {
  id: string;
  actor: Person;
  action: string;
  target: string;
  at: string;
};

export type Message = {
  id: string;
  /** The other participant in the thread, whichever way it was sent. */
  memberId: string;
  from: "me" | "them";
  text: string;
  date: string;
  time: string;
};

/** Product branding shown before sign-in, when there's no session/workspace yet. */
export const APP_NAME = "Acme Corp";

export const TASK_STATUSES: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To Do" },
  { status: "in-progress", label: "In Progress" },
  { status: "in-review", label: "In Review" },
  { status: "done", label: "Done" },
];

export const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "active",
  "on-hold",
  "completed",
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

/** Status values alone, for schema enums. */
export const TASK_STATUS_VALUES: TaskStatus[] = TASK_STATUSES.map((item) => item.status);

export const SECTION_TYPES: SectionType[] = [
  "hero",
  "features",
  "cta",
  "testimonials",
  "gallery",
  "newsletter",
  "faq",
];

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["draft", "active", "paused", "completed"];

/**
 * The optional sub-pages offered when configuring a project, in the order the
 * picker lists them — which is also the order they appear under the project in
 * the sidebar.
 */
export const PROJECT_FEATURES: { key: ProjectFeature; label: string; hint: string }[] = [
  { key: "tasks", label: "Tasks", hint: "Kanban board for this project's work." },
  { key: "campaigns", label: "Campaigns", hint: "Marketing campaigns and their budgets." },
  {
    key: "landing-pages",
    label: "Landing Pages",
    hint: "Build page sections for this project.",
  },
  {
    key: "time-tracking",
    label: "Time Tracking",
    hint: "Log time against this project's tasks, with variance per member.",
  },
  {
    key: "timesheet",
    label: "Timesheet",
    hint: "Week-by-week grid of hours per member.",
  },
  { key: "report", label: "Report", hint: "Cost, hours and status summary." },
];

/** Feature keys alone, for schema enums. */
export const PROJECT_FEATURE_KEYS: ProjectFeature[] = PROJECT_FEATURES.map((item) => item.key);

/**
 * What a project shows when `features` has never been set. Matches the pages
 * projects displayed before they became optional, so the column arriving does
 * not silently hide anything.
 */
export const DEFAULT_PROJECT_FEATURES: ProjectFeature[] = [
  "tasks",
  "campaigns",
  "timesheet",
  "report",
];

export const DESIGNATIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Engineering Manager",
  "Product Designer",
  "Product Manager",
  "QA Engineer",
  "DevOps Engineer",
  "Marketing Specialist",
  "Content Writer",
];

/** Swatches offered when creating a team or project. */
export const COLOR_SWATCHES = [
  "hsl(var(--primary))",
  "#21c45d",
  "#f59f0a",
  "#ef4343",
  "#a73cdd",
  "#1ac3e6",
];

/**
 * "Today" for the demo data — overdue checks are relative to this so the seeded
 * February dates keep telling the same story regardless of the wall clock.
 */
export const TODAY = "2026-02-17";

// --- Date helpers ----------------------------------------------------------
// All UTC-based so a server in one timezone and a browser in another agree.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Formats `2026-02-17` as `Feb 17` without depending on the runtime locale. */
export function formatDay(iso: string) {
  const [, month, day] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

/** Parses `2026-02-17` as a UTC date, avoiding local-timezone drift. */
export function parseDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** The seven ISO dates of the Monday-start week containing `iso`. */
export function getWeekDays(iso: string) {
  const date = parseDay(iso);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(date.getTime() - weekday * DAY_MS);
  return Array.from({ length: 7 }, (_, index) => toIso(new Date(monday.getTime() + index * DAY_MS)));
}

export function shiftWeek(iso: string, weeks: number) {
  return toIso(new Date(parseDay(iso).getTime() + weeks * 7 * DAY_MS));
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Calendar grid (Sunday-start) for the month containing `iso`. */
export function getMonthGrid(iso: string) {
  const date = parseDay(iso);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leading = first.getUTCDay();

  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIso(new Date(Date.UTC(year, month, day))));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return { cells, label: `${FULL_MONTHS[month]} ${year}` };
}

// --- Small numeric helpers -------------------------------------------------

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function percent(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export const minutesToHours = (minutes: number) => minutes / 60;
export const hoursToMinutes = (hours: number) => Math.round(hours * 60);
