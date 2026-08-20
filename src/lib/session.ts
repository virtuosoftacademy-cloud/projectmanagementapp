
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/domain";
import { roleToDomain } from "@/lib/mappers";
import { can, type Permission } from "@/lib/permissions";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  /** The workspace this session is currently scoped to — see the switcher in AppSidebar. */
  workspaceId: string;
  role: Role;
};

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
    role: roleToDomain[session.user.role],
  };
});

/** Session user, or a redirect to sign-in. Call at the top of protected pages. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/signin?from=${encodeURIComponent(returnTo)}` : "/signin");
  }
  return user;
}

/**
 * Session user, or a redirect away. Call in server actions and in pages whose
 * whole purpose requires the permission.
 *
 * Next's `forbidden()` / `unauthorized()` would express this better, but they
 * are still behind the experimental `authInterrupts` flag in this version, so
 * authorization stays on stable APIs.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  if (!can(user.role, permission)) redirect(`/forbidden?need=${encodeURIComponent(permission)}`);
  return user;
}

/** Non-throwing check, for conditional rendering. */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const user = await getSessionUser();
  return can(user?.role, permission);
}
