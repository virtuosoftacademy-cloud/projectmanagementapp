/**
 * Seed content for the demo workspaces.
 *
 * Rows reference each other by stable natural keys (email for people, a `key`
 * for projects and tasks, a `slug` for teams and workspaces) rather than
 * database ids, so the seeder can run repeatedly and the real cuids stay
 * opaque.
 *
 * Two workspaces are seeded — `acme` and `globex` — so the workspace switcher
 * has something real to demonstrate. Alex belongs to both (owner of one,
 * admin of the other); everyone else belongs to just the one their team sits
 * in, and every project/task/time-entry reference below only names people who
 * are actually members of that record's workspace.
 */

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
    startDate: "2026-01-15",
    endDate: "2026-04-15",
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
    startDate: "2026-02-01",
    endDate: "2026-06-30",
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
    startDate: "2026-03-01",
    endDate: "2026-05-01",
    memberEmails: ["sarah@company.com", "mike@company.com"],
  },
] as const;

/** Estimates are minutes so nothing is ever a repeating fraction. */
export const tasks = [
  { key: "wireframe", project: "website-redesign", title: "Wireframe", status: "DONE", priority: "MEDIUM", assignees: ["emma@company.com"], estimateMinutes: 120, billable: true },
  { key: "visual-design", project: "website-redesign", title: "Visual Design", status: "DONE", priority: "HIGH", assignees: ["emma@company.com"], estimateMinutes: 240, billable: true },
  { key: "write-copy", project: "website-redesign", title: "Write Copy", status: "IN_PROGRESS", priority: "MEDIUM", assignees: ["emma@company.com"], estimateMinutes: 120, billable: true, dueDate: "2026-02-18" },
  { key: "landing-page", project: "website-redesign", title: "Develop Landing Page", status: "IN_PROGRESS", priority: "HIGH", assignees: ["alex@company.com", "emma@company.com"], estimateMinutes: 960, billable: true, dueDate: "2026-02-28", subtasksTotal: 5, subtasksDone: 2 },
  { key: "cicd", project: "website-redesign", title: "Set up CI/CD pipeline", status: "TODO", priority: "HIGH", assignees: ["alex@company.com"], estimateMinutes: 180, billable: false, dueDate: "2026-02-25" },
  { key: "footer", project: "website-redesign", title: "Footer component", status: "TODO", priority: "LOW", assignees: ["alex@company.com"], estimateMinutes: 90, billable: true },
  { key: "a11y-audit", project: "website-redesign", title: "Accessibility audit", status: "TODO", priority: "MEDIUM", assignees: ["emma@company.com", "alex@company.com"], estimateMinutes: 240, billable: true },
  { key: "analytics", project: "website-redesign", title: "Analytics instrumentation", status: "TODO", priority: "LOW", assignees: ["alex@company.com"], estimateMinutes: 180, billable: true },
  { key: "auth-flow", project: "mobile-app", title: "User authentication flow", status: "TODO", priority: "URGENT", assignees: ["alex@company.com", "mike@company.com"], estimateMinutes: 240, billable: true, dueDate: "2026-02-18" },
  { key: "push", project: "mobile-app", title: "Push notifications", status: "TODO", priority: "MEDIUM", assignees: ["mike@company.com"], estimateMinutes: 360, billable: true, dueDate: "2026-03-01" },
  { key: "offline", project: "mobile-app", title: "Offline mode", status: "TODO", priority: "LOW", assignees: ["mike@company.com"], estimateMinutes: 480, billable: true },
  { key: "schema", project: "api-v2", title: "Schema design", status: "IN_REVIEW", priority: "HIGH", assignees: ["sarah@company.com"], estimateMinutes: 240, billable: true, dueDate: "2026-02-15" },
] as const;

export const timeEntries = [
  { date: "2026-02-10", email: "alex@company.com", task: "wireframe", minutes: 120, billable: true, note: "Finished wireframe" },
  { date: "2026-02-12", email: "alex@company.com", task: "auth-flow", minutes: 240, billable: true, note: "Auth flow implementation" },
  { date: "2026-02-13", email: "sarah@company.com", task: "schema", minutes: 90, billable: true, note: "Schema review session" },
  { date: "2026-02-14", email: "emma@company.com", task: "visual-design", minutes: 180, billable: true, note: "Visual design WIP" },
  { date: "2026-02-14", email: "emma@company.com", task: "write-copy", minutes: 150, billable: true, note: "Drafting copy" },
  { date: "2026-02-15", email: "alex@company.com", task: "auth-flow", minutes: 200, billable: true, note: "OAuth integration" },
  { date: "2026-02-16", email: "emma@company.com", task: "visual-design", minutes: 60, billable: true, note: "Final design revisions" },
  { date: "2026-02-17", email: "alex@company.com", task: "cicd", minutes: 120, billable: false, note: "Pipeline setup" },
] as const;

export const campaigns = [
  { project: "website-redesign", name: "Q1 Launch Campaign", description: "Launch campaign for the redesigned website", status: "ACTIVE", progress: 65, startDate: "2026-01-20", endDate: "2026-03-31", budget: 50_000 },
  { project: "website-redesign", name: "SEO Optimization", description: "Improve search rankings across all pages", status: "ACTIVE", progress: 40, startDate: "2026-02-01", endDate: "2026-04-15", budget: 15_000 },
  { project: "website-redesign", name: "Social Media Blitz", description: "Coordinated social media campaign across platforms", status: "DRAFT", progress: 10, startDate: "2026-03-01", endDate: "2026-05-01", budget: 25_000 },
  { project: "mobile-app", name: "App Beta Launch", description: "Beta testing campaign for early adopters", status: "ACTIVE", progress: 25, startDate: "2026-03-01", endDate: "2026-04-30", budget: 30_000 },
  { project: "api-v2", name: "API Developer Outreach", description: "Engage developer community with the new API", status: "PAUSED", progress: 15, startDate: "2026-02-15", endDate: "2026-05-15", budget: 20_000 },
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
  { workspaceSlug: "globex", email: "alex@company.com", action: "created task", target: "Set up CI/CD pipeline", at: "2026-02-17T14:30:00Z" },
  { workspaceSlug: "globex", email: "emma@company.com", action: "completed task", target: "Visual Design", at: "2026-02-17T12:00:00Z" },
  { workspaceSlug: "globex", email: "emma@company.com", action: "logged 2.5h on", target: "Write Copy", at: "2026-02-17T10:15:00Z" },
  { workspaceSlug: "acme", email: "alex@company.com", action: "moved to In Review", target: "Schema design", at: "2026-02-16T16:45:00Z" },
  { workspaceSlug: "acme", email: "mike@company.com", action: "commented on", target: "Push notifications", at: "2026-02-16T15:00:00Z" },
] as const;

export const messages = [
  { workspaceSlug: "acme", from: "sarah@company.com", to: "alex@company.com", body: "Hey, can you review the landing page wireframe?", at: "2026-02-17T09:12:00Z" },
  { workspaceSlug: "acme", from: "alex@company.com", to: "sarah@company.com", body: "Sure, looking now.", at: "2026-02-17T09:15:00Z" },
  { workspaceSlug: "acme", from: "mike@company.com", to: "alex@company.com", body: "CI pipeline is green ✅", at: "2026-02-17T11:02:00Z" },
  { workspaceSlug: "globex", from: "emma@company.com", to: "alex@company.com", body: "Pushed first draft of copy.", at: "2026-02-16T18:40:00Z" },
] as const;
