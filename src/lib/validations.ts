/**
 * Validation schemas
 * Zod schemas shared by forms and the server actions they submit to.
 *
 * A schema is defined once and used on both sides: the form parses to give
 * immediate feedback, the action parses again because that is the copy an
 * attacker cannot skip. `z.infer` then keeps the action's input type honest.
 */

import { z } from "zod";
import {
  CAMPAIGN_STATUSES,
  PRIORITIES,
  PROJECT_FEATURE_KEYS,
  PROJECT_STATUSES,
  SECTION_TYPES,
  TASK_STATUS_VALUES,
} from "@/lib/domain";
import { APP_PAGE_KEYS, PERMISSION_KEYS, ROLES, isFixedRole } from "@/lib/permissions";

// ============================================================================
// SHARED FIELDS
// ============================================================================

/** Digits, spaces and the usual punctuation, 7–20 characters. */
const PHONE_PATTERN = /^[+]?[\d\s().-]{7,20}$/;

/** At least one lowercase, uppercase, digit and symbol from @$!%*?& */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export const emailSchema = z
  .email("Enter a valid email address.")
  .trim()
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .regex(
    PASSWORD_PATTERN,
    "Password needs an uppercase letter, a lowercase letter, a number and one of @$!%*?&.",
  );

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || PHONE_PATTERN.test(value), "Enter a valid phone number.");

export const nameSchema = (label: string) =>
  z.string().trim().min(1, `${label} is required.`).max(50, `${label} must be 50 characters or fewer.`);

export const roleSchema = z.enum(ROLES as [string, ...string[]]);

/** ISO day (`2026-02-17`) or empty, normalised to `string | null`. */
export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Enter a valid date.")
  .transform((value) => value || null);

/** The individual rules, for the live checklist under a password field. */
export const passwordChecks = [
  { label: "8+ characters", test: (value: string) => value.length >= PASSWORD_MIN_LENGTH },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "Number", test: (value: string) => /\d/.test(value) },
  { label: "Symbol (@$!%*?&)", test: (value: string) => /[@$!%*?&]/.test(value) },
];

// ============================================================================
// AUTH
// ============================================================================

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

// ============================================================================
// USERS
// ============================================================================

export const createUserSchema = z
  .object({
    firstName: nameSchema("First name"),
    lastName: nameSchema("Last name"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm the password."),
    phone: phoneSchema,
    role: roleSchema,
    designation: z.string().trim().max(60).default(""),
    /// Empty means "no team". Whether the id names a team in *this* workspace
    /// is checked in the action — zod cannot reach the database.
    teamId: z.string().trim().default(""),
    monthlyHours: z.coerce.number().int().min(0).max(744, "That is more hours than a month has."),
    active: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

/** The lighter invite used from the settings screen — no password required. */
export const inviteMemberSchema = z.object({
  name: nameSchema("Name"),
  email: emailSchema,
  role: roleSchema,
  /// Optional, and only offered by callers that have a team list to show — the
  /// settings card posts no `teamId` at all, which lands here as "".
  teamId: z.string().trim().default(""),
  password: z
    .string()
    .refine(
      (value) => value === "" || value.length >= PASSWORD_MIN_LENGTH,
      `Temporary password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    ),
});

export const updateRoleSchema = z.object({
  userId: z.string().min(1, "Pick a member."),
  role: roleSchema,
});

export const setDisabledSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Select at least one account."),
  disabled: z.boolean(),
});

/**
 * A role an owner or admin defines.
 *
 * `inheritsFrom` is required, not optional with a default: it is what every
 * role-based guard reads, and a role that silently fell back to the least
 * privileged base would look correct in the UI while refusing its holder
 * everywhere.
 */
export const customRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Give the role a name.")
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
    // Only the fixed roles are reserved. Manager, Member, Viewer and Guest are
    // themselves seeded as editable roles, so those names are legitimately in
    // use here and must stay available.
    .refine((value) => !isFixedRole(value), "That name belongs to a fixed role."),
  label: z.string().trim().min(1, "Give the role a label.").max(60),
  description: z.string().trim().max(500).default(""),
  inheritsFrom: roleSchema,
  permissions: z.array(z.enum(PERMISSION_KEYS as [string, ...string[]])),
});

/** Assign which pages a member may reach. */
export const setUserPagesSchema = z.object({
  userId: z.string().min(1, "Pick a member."),
  /// Unknown keys are rejected rather than ignored, so a stale client cannot
  /// quietly write junk into the column that `resolvePages` then has to skip.
  pages: z.array(z.enum(APP_PAGE_KEYS as [string, ...string[]])),
});

/** Add an account that already exists to the caller's workspace. */
export const addMemberSchema = z.object({
  userId: z.string().min(1, "Pick someone to add."),
  role: roleSchema,
  /// Empty means "leave their team as it is" — see `addMemberAction`.
  teamId: z.string().trim().default(""),
});

// ============================================================================
// WORKSPACE
// ============================================================================

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Give the workspace a name.").max(80),
  description: z.string().trim().max(500).default(""),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Give the workspace a name.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "A URL slug is required.")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."),
});

// ============================================================================
// TEAMS
// ============================================================================

export const teamSchema = z.object({
  name: z.string().trim().min(1, "Give the team a name.").max(60),
  slug: z
    .string()
    .trim()
    .min(1, "A slug is required.")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/, "Team code must be 2-6 letters or numbers."),
  description: z.string().trim().max(500).default(""),
  color: z.string().min(1),
  leadId: z.string().trim().default(""),
  memberIds: z.array(z.string().min(1)).default([]),
});

export const updateTeamSchema = teamSchema.extend({ id: z.string().min(1) });

// ============================================================================
// PROJECTS
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(120),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]),
  color: z.string().min(1),
  teamId: z.string().trim().default(""),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  memberIds: z.array(z.string().min(1)).default([]),
});

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Give the project a name.").max(120),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]),
  teamId: z.string().trim().default(""),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  defaultBillable: z.boolean(),
});

export const addProjectMembersSchema = z.object({
  projectId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1, "Pick at least one person."),
});

/** An empty list is valid — a project may switch every optional page off. */
export const projectFeaturesSchema = z.object({
  projectId: z.string().min(1),
  features: z.array(z.enum(PROJECT_FEATURE_KEYS as [string, ...string[]])),
});

// ============================================================================
// TASKS
// ============================================================================

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Pick a project."),
  title: z.string().trim().min(1, "Give the task a title.").max(200),
  status: z.enum(TASK_STATUS_VALUES as [string, ...string[]]),
  priority: z.enum(PRIORITIES as [string, ...string[]]),
  assigneeIds: z.array(z.string().min(1)).default([]),
  estimateHours: z.coerce.number().min(0).max(10_000),
  billable: z.boolean(),
  dueDate: isoDateSchema,
});

export const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(TASK_STATUS_VALUES as [string, ...string[]]),
});

/**
 * Editing an existing task.
 *
 * Deliberately the same field set as creation minus `projectId`: a task does
 * not move between projects here, because its time entries, attachments and
 * board position all belong to the project it was created in.
 */
export const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "Give the task a title.").max(200),
  description: z.string().trim().max(5000).default(""),
  status: z.enum(TASK_STATUS_VALUES as [string, ...string[]]),
  priority: z.enum(PRIORITIES as [string, ...string[]]),
  assigneeIds: z.array(z.string().min(1)).default([]),
  labelIds: z.array(z.string().min(1)).default([]),
  estimateHours: z.coerce.number().min(0).max(10_000),
  billable: z.boolean(),
  dueDate: isoDateSchema,
});

export const archiveTaskSchema = z.object({
  taskId: z.string().min(1),
  /** False restores it to the board. */
  archived: z.boolean(),
});

// ============================================================================
// LABELS
// ============================================================================

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Give the label a name.").max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour."),
});

export const updateLabelSchema = labelSchema.extend({ id: z.string().min(1) });

// ============================================================================
// TIME TRACKING
// ============================================================================

/** Nothing sensible is longer than a day, whether typed or timed. */
export const MAX_ENTRY_MINUTES = 24 * 60;

export const logTimeSchema = z.object({
  taskId: z.string().min(1, "Pick a task."),
  minutes: z.coerce
    .number()
    .int("Log whole minutes.")
    .min(1, "Log at least one minute.")
    .max(MAX_ENTRY_MINUTES, "That is more than a day."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  note: z.string().trim().max(500).default(""),
});

/** A blank optional field arrives as `""` from a form; treat it as absent. */
const optionalDateTime = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.iso.datetime({ offset: true }).optional(),
);

/**
 * The fields a manual time entry can be given, before the cross-field rules.
 *
 * Two ways to say the same thing: a duration on a day, or a start and an end.
 * Both are offered because both are how people actually remember work — "about
 * an hour yesterday" and "09:15 until 10:40" — and the second additionally
 * records *when*, which the first cannot.
 */
const timeEntryFields = {
  durationMinutes: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number()
      .int("Log whole minutes.")
      .min(1, "Log at least one minute.")
      .max(MAX_ENTRY_MINUTES, "That is more than a day.")
      .optional(),
  ),
  /** The day a duration-only entry belongs to; ignored when times are given. */
  date: isoDateSchema,
  startedAt: optionalDateTime,
  endedAt: optionalDateTime,
  note: z.string().trim().max(500).default(""),
};

type TimeEntryShape = {
  durationMinutes?: number;
  startedAt?: string;
  endedAt?: string;
};

/**
 * The rules that span more than one field, applied identically to creating and
 * to editing an entry.
 *
 * `superRefine` rather than chained `.refine` calls so each message lands on
 * the field that is actually wrong, and so the object stays extendable — a
 * refined Zod schema is no longer an object and cannot be given an id later.
 */
function checkTimeEntry(data: TimeEntryShape, ctx: z.RefinementCtx) {
  const hasSpan = Boolean(data.startedAt && data.endedAt);

  if (data.durationMinutes === undefined && !hasSpan) {
    ctx.addIssue({
      code: "custom",
      path: ["durationMinutes"],
      message: "Give a duration, or a start and an end time.",
    });
    return;
  }

  if (!hasSpan) return;

  const start = new Date(data.startedAt!).getTime();
  const end = new Date(data.endedAt!).getTime();

  if (end <= start) {
    ctx.addIssue({ code: "custom", path: ["endedAt"], message: "End must be after start." });
    return;
  }

  const minutes = Math.round((end - start) / 60_000);
  if (minutes > MAX_ENTRY_MINUTES) {
    ctx.addIssue({
      code: "custom",
      path: ["endedAt"],
      message: "That is more than a day — split it into separate entries.",
    });
  }

  // Time that has not happened yet cannot have been worked. Allowing it would
  // let a mistyped year put hours into a week nobody can reconcile.
  if (end > Date.now() + 60_000) {
    ctx.addIssue({ code: "custom", path: ["endedAt"], message: "That is in the future." });
  }
}

export const manualTimeEntrySchema = z
  .object({ taskId: z.string().min(1, "Pick a task."), ...timeEntryFields })
  .superRefine(checkTimeEntry);

export const updateTimeEntrySchema = z
  .object({ entryId: z.string().min(1), ...timeEntryFields })
  .superRefine(checkTimeEntry);

export const startTimerSchema = z.object({
  taskId: z.string().min(1, "Pick a task."),
  note: z.string().trim().max(500).default(""),
});

export type ManualTimeEntryInput = z.infer<typeof manualTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

// ============================================================================
// CAMPAIGNS
// ============================================================================

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Give the campaign a name.").max(120),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(CAMPAIGN_STATUSES as [string, ...string[]]),
  progress: z.coerce.number().int().min(0).max(100),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  budget: z.coerce.number().int().min(0, "Budget cannot be negative."),
});

// ============================================================================
// LANDING SECTIONS
// ============================================================================

export const addSectionSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(SECTION_TYPES as [string, ...string[]]),
});

export const updateSectionSchema = z.object({
  id: z.string().min(1),
  heading: z.string().trim().min(1, "A section needs a heading.").max(200),
  subheading: z.string().trim().max(300).nullable(),
  items: z.array(z.string().trim().min(1)).nullable(),
  primaryCta: z.string().trim().max(60).nullable(),
  secondaryCta: z.string().trim().max(60).nullable(),
});

// ============================================================================
// MESSAGES
// ============================================================================

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, "Pick someone to message."),
  body: z.string().trim().min(1, "Write a message first.").max(4000),
});

// ============================================================================
// ERROR HELPERS
// ============================================================================

export type FieldErrors = Record<string, string>;

/** First message per field, for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** A single message, for actions that report one string back to the UI. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "That input is not valid.";
}
