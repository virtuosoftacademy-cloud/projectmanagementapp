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
  PROJECT_STATUSES,
  SECTION_TYPES,
  TASK_STATUS_VALUES,
} from "@/lib/domain";
import { ROLES } from "@/lib/permissions";

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
    hourlyRate: z.coerce.number().int().min(0, "Rate cannot be negative.").max(1_000_000),
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

// ============================================================================
// TIME TRACKING
// ============================================================================

export const logTimeSchema = z.object({
  taskId: z.string().min(1, "Pick a task."),
  minutes: z.coerce
    .number()
    .int("Log whole minutes.")
    .min(1, "Log at least one minute.")
    .max(24 * 60, "That is more than a day."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  note: z.string().trim().max(500).default(""),
});

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
