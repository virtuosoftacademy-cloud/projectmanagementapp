
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role, Theme } from "@/lib/domain";
import { roleToDomain, themeToDomain } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import {
  APP_PAGES,
  narrowPages,
  pagesForPermissions,
  resolveBaseRole,
  type AppPage,
  type Permission,
  type ResolvedRole,
} from "@/lib/permissions";
import { getMemberPages } from "@/lib/queries";
import { resolveMemberRole } from "@/lib/resolve-role";

/**
 * A signed-in account, which may not belong to a workspace yet.
 *
 * Both `workspaceId` and `role` are null in exactly one situation: the account
 * exists and the password checked out, but it holds no `WorkspaceMember` row.
 * That is the state `/onboarding` resolves.
 */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  /** The workspace this session is scoped to — see the switcher in AppSidebar. */
  workspaceId: string | null;
  /** Role *within* `workspaceId`; null when there is no workspace. */
  role: Role | null;
};

/**
 * A session that is inside a workspace.
 *
 * `requireUser` and `requirePermission` return this, so the ~50 pages and
 * actions behind them keep receiving a plain `string` workspaceId and a real
 * role — the nullability stops at this boundary rather than spreading.
 */
export type ActiveSessionUser = SessionUser & { workspaceId: string; role: Role };

/**
 * The verified session for this request.
 *
 * `proxy.ts` only does a cheap cookie check; this is the real gate, and every
 * page or action that touches protected data must call it. Wrapped in `cache()`
 * so several callers in one render share a single verification.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image,
    workspaceId: session.user.workspaceId,
    // The JWT carries the database enum; the app speaks lowercase.
    role: session.user.role ? roleToDomain[session.user.role] : null,
  };
});

/**
 * A signed-in account, workspace or not. Only onboarding should use this —
 * everything else wants `requireUser`, which guarantees a workspace.
 */
export async function requireAccount(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/signin?from=${encodeURIComponent(returnTo)}` : "/signin");
  }
  return user;
}

/**
 * Session user inside a workspace, or a redirect.
 *
 * Two ways out: no session at all sends you to sign-in; a session with no
 * workspace sends you to onboarding, which is the only screen that can create
 * the first one.
 */
export async function requireUser(returnTo?: string): Promise<ActiveSessionUser> {
  const user = await requireAccount(returnTo);
  if (!user.workspaceId || !user.role) redirect("/onboarding");
  return user as ActiveSessionUser;
}

/**
 * Session user, or a redirect away. Call in server actions and in pages whose
 * whole purpose requires the permission.
 *
 * Next's `forbidden()` / `unauthorized()` would express this better, but they
 * are still behind the experimental `authInterrupts` flag in this version, so
 * authorization stays on stable APIs.
 */
export async function requirePermission(permission: Permission): Promise<ActiveSessionUser> {
  const user = await requireUser();
  if (!(await viewerCan(permission))) {
    redirect(`/forbidden?need=${encodeURIComponent(permission)}`);
  }
  return user;
}

/** Non-throwing check, for conditional rendering. */
export async function hasPermission(permission: Permission): Promise<boolean> {
  return viewerCan(permission);
}

/**
 * The viewer's resolved role — base or custom.
 *
 * Everything authorization-related goes through this rather than reading
 * `user.role` directly, because a custom role's permissions are a narrowed
 * subset of its base role and only the resolver knows that subset. Reading the
 * enum alone would hand a custom-role holder their base role's full rights.
 */
export const getViewerRole = cache(async (): Promise<ResolvedRole | null> => {
  const user = await getSessionUser();
  if (!user?.workspaceId || !user.role) return null;

  // Falls back to the base role if the membership vanished mid-request.
  return (await resolveMemberRole(user.workspaceId, user.id)) ?? resolveBaseRole(user.role);
});

/** Whether the viewer holds a permission, honouring a custom role's narrowing. */
export async function viewerCan(permission: Permission): Promise<boolean> {
  const resolved = await getViewerRole();
  return resolved ? resolved.permissions.includes(permission) : false;
}

/**
 * Which projects the viewer should be shown, as the `memberId` argument to
 * `getProjects`.
 *
 * Returns their id for most people — they see only projects they were added to.
 * Returns `undefined` for owners and admins, who see every project in the
 * workspace: they are responsible for it, and scoping them the same way hid a
 * workspace's own projects from the person who owns it, which reads as the
 * sidebar being broken rather than as a rule being applied.
 *
 * One helper rather than the check repeated at each call site, so the sidebar
 * and the pages it links to can never disagree about what exists.
 */
export async function projectScope(): Promise<string | undefined> {
  const user = await getSessionUser();
  if (!user) return undefined;
  return (await viewerCan("workspace.settings")) ? undefined : user.id;
}

/**
 * The pages the current viewer may reach, after their assignment is applied.
 *
 * Read from the database rather than the JWT on purpose: the token is minted at
 * sign-in, so an owner revoking a page would not take effect until that person
 * signed out and back in — too long for something meant as an access control.
 * `cache()` on both this and `getMemberPages` keeps it to one query per request.
 */
export const getViewerPages = cache(async (): Promise<AppPage[]> => {
  const user = await getSessionUser();
  if (!user?.workspaceId || !user.role) return [];

  const [resolved, assigned] = await Promise.all([
    getViewerRole(),
    getMemberPages(user.workspaceId, user.id),
  ]);
  if (!resolved) return [];

  // From the resolved permissions, not the base role: a custom role that drops
  // `reports.view` must lose Analytics, not merely lose the ability to use it.
  return narrowPages(pagesForPermissions(resolved.permissions), assigned);
});

/**
 * Gate a page on per-user assignment as well as role.
 *
 * Use *instead of* `requireUser`/`requirePermission` on any page listed in
 * `APP_PAGES`: it applies the role's permission and the member's assignment in
 * one place, so the two cannot be checked inconsistently.
 *
 * Being unassigned a page is not a role failure, so the reason carried to
 * /forbidden is the page rather than a permission — "Analytics isn't assigned
 * to you" is true, where "you lack View reports" may not be.
 */
export async function requirePage(page: AppPage): Promise<ActiveSessionUser> {
  const user = await requireUser();
  const reachable = await getViewerPages();

  if (!reachable.includes(page)) {
    const entry = APP_PAGES.find((item) => item.key === page);
    // A role that never had the page gets the permission message; someone who
    // had it removed gets the page message. Different causes, different fixes.
    if (entry?.permission && !(await viewerCan(entry.permission))) {
      redirect(`/forbidden?need=${encodeURIComponent(entry.permission)}`);
    }
    redirect(`/forbidden?page=${encodeURIComponent(page)}`);
  }

  return user;
}

/**
 * The signed-in person's theme, straight from their account row.
 *
 * Read on the server so the class is on `<html>` in the first response: there
 * is no client library reading localStorage after hydration, and therefore no
 * flash of the wrong theme. Signed-out pages get the default.
 */
export const getViewerTheme = cache(async (): Promise<Theme> => {
  const user = await getSessionUser();
  if (!user) return "light";

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { theme: true },
  });

  return row ? themeToDomain[row.theme] : "light";
});
