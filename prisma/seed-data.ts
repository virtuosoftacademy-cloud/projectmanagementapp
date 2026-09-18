
/**
 * Demo data, dated relative to whenever it is seeded.
 *
 * Every date here used to be a literal anchored to a `TODAY` constant frozen at
 * 2026-02-17. Once the app started reading the real clock that data aged: every
 * deadline was months overdue and the weekly charts were empty. Offsets keep
 * the story identical — the same one task just overdue, the same week of logged
 * time — whichever day you seed on.
 *
 * Offsets are resolved once, at import.
 */

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * A calendar day `offset` days from today, as `yyyy-MM-dd`.
 *
 * Local-calendar based, matching `todayIso()` in `lib/domain.ts` and the
 * `Date.UTC(...)` conversion `seed.ts` applies — so a seeded "today" is the
 * same day the app calls today.
 */
function day(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** An instant `minutes` in the past, as an ISO timestamp. Never in the future. */
function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const workspaces = [
  { slug: "acme", name: "Acme Corp", description: "Main workspace for all projects" },
  { slug: "globex", name: "Globex Inc", description: "Globex Inc's workspace" },
] as const;

export const teams = [
  {
    slug: "engineering",
    workspaceSlug: "acme",
    name: "Engineering",
    code: "ENG",
    description: "Builds and ships the product.",
    color: "hsl(var(--primary))",
    leadEmail: "alex@company.com",
  },
  {
    slug: "design-studio",
    workspaceSlug: "globex",
    name: "Design Studio",
    code: "DSGN",
    description: "Brand, product design and copy.",
    color: "#f59f0a",
    leadEmail: "emma@company.com",
  },
] as const;

export const users = [
  {
    email: "alex@company.com",
    name: "Alex Chen",
    teamSlug: "engineering",
    designation: "Engineering Manager",
    hourlyRate: 800,
    monthlyHours: 160,
    memberships: [
      { workspaceSlug: "acme", role: "OWNER" },
      { workspaceSlug: "globex", role: "ADMIN" },
    ],
  },
  {
    email: "sarah@company.com",
    name: "Sarah Kim",
    teamSlug: "engineering",
    designation: "Senior Software Engineer",
    hourlyRate: 600,
    monthlyHours: 160,
    memberships: [{ workspaceSlug: "acme", role: "ADMIN" }],
  },
  {
    email: "emma@company.com",
    name: "Emma Wilson",
    teamSlug: "design-studio",
    designation: "Product Designer",
    hourlyRate: 550,
    monthlyHours: 160,
    memberships: [{ workspaceSlug: "globex", role: "MANAGER" }],
  },
  {
    email: "mike@company.com",
    name: "Mike Johnson",
    teamSlug: "engineering",
    designation: "Software Engineer",
    hourlyRate: 500,
    monthlyHours: 160,
    memberships: [{ workspaceSlug: "acme", role: "MEMBER" }],
  },
  {
    email: "david@company.com",
    name: "David Park",
    teamSlug: "design-studio",
    designation: "Content Writer",
    hourlyRate: 400,
    monthlyHours: 160,
    memberships: [{ workspaceSlug: "globex", role: "VIEWER" }],
  },
  {
    email: "client@external.com",
    name: "Client User",
    teamSlug: "engineering",
    designation: null,
    hourlyRate: 0,
    monthlyHours: 0,
    memberships: [{ workspaceSlug: "acme", role: "GUEST" }],
  },
] as const;

export const projects = [
  {
    key: "website-redesign",
    workspaceSlug: "globex",
    team: "design-studio",
    name: "Website Redesign",
    description: "Redesign the company website with a modern look",
    status: "ACTIVE",
    color: "hsl(var(--primary))",
    startDate: day(-33),
    endDate: day(57),
    memberEmails: ["emma@company.com", "alex@company.com", "david@company.com"],
  },
  {
    key: "mobile-app",
    workspaceSlug: "acme",
    team: "engineering",
    name: "Mobile App",
    description: "Build the iOS and Android companion app",
    status: "PLANNING",
    color: "#f59f0a",
    startDate: day(-16),
    endDate: day(133),
    memberEmails: ["alex@company.com", "mike@company.com", "sarah@company.com"],
  },
  {
    key: "api-v2",
    workspaceSlug: "acme",
    team: "engineering",
    name: "API v2",
    description: "Next generation API with GraphQL support",
    status: "ACTIVE",
    color: "#21c45d",
    startDate: day(-10),
    endDate: day(73),
    memberEmails: ["sarah@company.com", "mike@company.com"],
  },
] as const;

/** Estimates are minutes so nothing is ever a repeating fraction. */
export const tasks = [
  { key: "wireframe", project: "website-redesign", title: "Wireframe", status: "DONE", priority: "MEDIUM", assignees: ["emma@company.com"], estimateMinutes: 120, billable: true },
  { key: "visual-design", project: "website-redesign", title: "Visual Design", status: "DONE", priority: "HIGH", assignees: ["emma@company.com"], estimateMinutes: 240, billable: true },
  { key: "write-copy", project: "website-redesign", title: "Write Copy", status: "IN_PROGRESS", priority: "MEDIUM", assignees: ["emma@company.com"], estimateMinutes: 120, billable: true, dueDate: day(1) },
  { key: "landing-page", project: "website-redesign", title: "Develop Landing Page", status: "IN_PROGRESS", priority: "HIGH", assignees: ["alex@company.com", "emma@company.com"], estimateMinutes: 960, billable: true, dueDate: day(11), subtasksTotal: 5, subtasksDone: 2 },
  { key: "cicd", project: "website-redesign", title: "Set up CI/CD pipeline", status: "TODO", priority: "HIGH", assignees: ["alex@company.com"], estimateMinutes: 180, billable: false, dueDate: day(8) },
  { key: "footer", project: "website-redesign", title: "Footer component", status: "TODO", priority: "LOW", assignees: ["alex@company.com"], estimateMinutes: 90, billable: true },
  { key: "a11y-audit", project: "website-redesign", title: "Accessibility audit", status: "TODO", priority: "MEDIUM", assignees: ["emma@company.com", "alex@company.com"], estimateMinutes: 240, billable: true },
  { key: "analytics", project: "website-redesign", title: "Analytics instrumentation", status: "TODO", priority: "LOW", assignees: ["alex@company.com"], estimateMinutes: 180, billable: true },
  { key: "auth-flow", project: "mobile-app", title: "User authentication flow", status: "TODO", priority: "URGENT", assignees: ["alex@company.com", "mike@company.com"], estimateMinutes: 240, billable: true, dueDate: day(1) },
  { key: "push", project: "mobile-app", title: "Push notifications", status: "TODO", priority: "MEDIUM", assignees: ["mike@company.com"], estimateMinutes: 360, billable: true, dueDate: day(12) },
  { key: "offline", project: "mobile-app", title: "Offline mode", status: "TODO", priority: "LOW", assignees: ["mike@company.com"], estimateMinutes: 480, billable: true },
  { key: "schema", project: "api-v2", title: "Schema design", status: "IN_REVIEW", priority: "HIGH", assignees: ["sarah@company.com"], estimateMinutes: 240, billable: true, dueDate: day(-2) },
] as const;

export const timeEntries = [
  { date: day(-7), email: "alex@company.com", task: "wireframe", minutes: 120, billable: true, note: "Finished wireframe" },
  { date: day(-5), email: "alex@company.com", task: "auth-flow", minutes: 240, billable: true, note: "Auth flow implementation" },
  { date: day(-4), email: "sarah@company.com", task: "schema", minutes: 90, billable: true, note: "Schema review session" },
  { date: day(-3), email: "emma@company.com", task: "visual-design", minutes: 180, billable: true, note: "Visual design WIP" },
  { date: day(-3), email: "emma@company.com", task: "write-copy", minutes: 150, billable: true, note: "Drafting copy" },
  { date: day(-2), email: "alex@company.com", task: "auth-flow", minutes: 200, billable: true, note: "OAuth integration" },
  { date: day(-1), email: "emma@company.com", task: "visual-design", minutes: 60, billable: true, note: "Final design revisions" },
  { date: day(0), email: "alex@company.com", task: "cicd", minutes: 120, billable: false, note: "Pipeline setup" },
] as const;

export const campaigns = [
  { project: "website-redesign", name: "Q1 Launch Campaign", description: "Launch campaign for the redesigned website", status: "ACTIVE", progress: 65, startDate: day(-28), endDate: day(42), budget: 50_000 },
  { project: "website-redesign", name: "SEO Optimization", description: "Improve search rankings across all pages", status: "ACTIVE", progress: 40, startDate: day(-16), endDate: day(57), budget: 15_000 },
  { project: "website-redesign", name: "Social Media Blitz", description: "Coordinated social media campaign across platforms", status: "DRAFT", progress: 10, startDate: day(12), endDate: day(73), budget: 25_000 },
  { project: "mobile-app", name: "App Beta Launch", description: "Beta testing campaign for early adopters", status: "ACTIVE", progress: 25, startDate: day(-20), endDate: day(72), budget: 30_000 },
  { project: "api-v2", name: "API Developer Outreach", description: "Engage developer community with the new API", status: "PAUSED", progress: 15, startDate: day(-2), endDate: day(87), budget: 20_000 },
] as const;

/** Default landing-page template, seeded for every project. */
export const landingSections = [
  {
    type: "HERO",
    heading: "Build Something Amazing",
    subheading: "The fastest way to launch your product",
    items: null,
    primaryCta: "Get Started",
    secondaryCta: null,
  },
  {
    type: "FEATURES",
    heading: "Why Choose Us",
    subheading: null,
    items: ["Feature 1", "Feature 2", "Feature 3"],
    primaryCta: null,
    secondaryCta: null,
  },
  {
    type: "CTA",
    heading: "Ready to Start?",
    subheading: "Join thousands of happy users",
    items: null,
    primaryCta: "Sign Up",
    secondaryCta: "Learn More",
  },
] as const;

export const activity = [
  { workspaceSlug: "globex", email: "alex@company.com", action: "created task", target: "Set up CI/CD pipeline", at: minutesAgo(120) },
  { workspaceSlug: "globex", email: "emma@company.com", action: "completed task", target: "Visual Design", at: minutesAgo(240) },
  { workspaceSlug: "globex", email: "emma@company.com", action: "logged 2.5h on", target: "Write Copy", at: minutesAgo(360) },
  { workspaceSlug: "acme", email: "alex@company.com", action: "moved to In Review", target: "Schema design", at: minutesAgo(1320) },
  { workspaceSlug: "acme", email: "mike@company.com", action: "commented on", target: "Push notifications", at: minutesAgo(1440) },
] as const;

export const messages = [
  { workspaceSlug: "acme", from: "sarah@company.com", to: "alex@company.com", body: "Hey, can you review the landing page wireframe?", at: minutesAgo(300) },
  { workspaceSlug: "acme", from: "alex@company.com", to: "sarah@company.com", body: "Sure, looking now.", at: minutesAgo(297) },
  { workspaceSlug: "acme", from: "mike@company.com", to: "alex@company.com", body: "CI pipeline is green ✅", at: minutesAgo(240) },
  { workspaceSlug: "globex", from: "emma@company.com", to: "alex@company.com", body: "Pushed first draft of copy.", at: minutesAgo(1180) },
] as const;
