import type {
  CampaignStatus as DbCampaignStatus,
  Priority as DbPriority,
  ProjectStatus as DbProjectStatus,
  Role as DbRole,
  SectionType as DbSectionType,
  TaskStatus as DbTaskStatus,
} from "@/lib/generated/prisma/enums";
import type {
  CampaignStatus,
  Priority,
  ProjectStatus,
  Role,
  SectionType,
  TaskStatus,
} from "@/lib/domain";

/**
 * Translation between the database's SCREAMING_SNAKE enums and the app's
 * lowercase-hyphen domain vocabulary. Keeping the mapping in one file means the
 * UI never sees a storage-shaped value, and a new enum member fails to compile
 * here rather than rendering as raw text somewhere.
 */
function invert<A extends string, B extends string>(map: Record<A, B>): Record<B, A> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [value, key])) as Record<
    B,
    A
  >;
}

export const roleToDomain: Record<DbRole, Role> = {
  OWNER: "owner",
  ADMIN: "admin",
  MANAGER: "manager",
  MEMBER: "member",
  VIEWER: "viewer",
  GUEST: "guest",
};
export const roleToDb = invert(roleToDomain);

export const projectStatusToDomain: Record<DbProjectStatus, ProjectStatus> = {
  ACTIVE: "active",
  PLANNING: "planning",
  ON_HOLD: "on-hold",
  COMPLETED: "completed",
};
export const projectStatusToDb = invert(projectStatusToDomain);

export const taskStatusToDomain: Record<DbTaskStatus, TaskStatus> = {
  TODO: "todo",
  IN_PROGRESS: "in-progress",
  IN_REVIEW: "in-review",
  DONE: "done",
};
export const taskStatusToDb = invert(taskStatusToDomain);

export const priorityToDomain: Record<DbPriority, Priority> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};
export const priorityToDb = invert(priorityToDomain);

export const campaignStatusToDomain: Record<DbCampaignStatus, CampaignStatus> = {
  ACTIVE: "active",
  DRAFT: "draft",
  PAUSED: "paused",
  COMPLETED: "completed",
};
export const campaignStatusToDb = invert(campaignStatusToDomain);

export const sectionTypeToDomain: Record<DbSectionType, SectionType> = {
  HERO: "hero",
  FEATURES: "features",
  CTA: "cta",
  TESTIMONIALS: "testimonials",
  GALLERY: "gallery",
  NEWSLETTER: "newsletter",
  FAQ: "faq",
};
export const sectionTypeToDb = invert(sectionTypeToDomain);

/** `@db.Date` columns come back as UTC midnight, so this slice is exact. */
export function dateToIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** ISO day string to the UTC midnight `Date` that `@db.Date` expects. */
export function isoToDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
