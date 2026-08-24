
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/domain";
import { roleToDomain } from "@/lib/mappers";
import { can, type Permission } from "@/lib/permissions";

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
  if (!can(user.role, permission)) redirect(`/forbidden?need=${encodeURIComponent(permission)}`);
  return user;
}

/** Non-throwing check, for conditional rendering. */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getSessionUser();
  return can(user?.role, permission);
}
