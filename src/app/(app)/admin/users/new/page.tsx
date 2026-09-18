import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "@/components/admin/create-user-form";
import type { Role } from "@/lib/domain";
import { PERMISSION_LABELS, permissionsFor } from "@/lib/permissions";
import { getTeams } from "@/lib/queries";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Add user" };

export default async function NewUserPage({
  searchParams,
}: PageProps<"/admin/users/new">) {
  const viewer = await requirePermission("members.invite");
  const teams = await getTeams(viewer.workspaceId);

  // Reached from two places — Administration → Users, and the "Add member"
  // button on the Team Members roster. Send people back where they started
  // rather than always to the directory.
  const { from } = await searchParams;
  const cameFromRoster = from === "team-members";
  const backHref = cameFromRoster ? "/team-members" : "/admin/users";
  const backLabel = cameFromRoster ? "Back to team members" : "Back to users";

  // Summarise each role from the permission matrix, so the hint under the role
  // picker can never drift from what the role actually grants.
  const roleHints = Object.fromEntries(
    (["owner", "admin", "manager", "member", "viewer", "guest"] as Role[]).map((role) => {
      const permissions = permissionsFor(role);
      return [
        role,
        permissions.length === 0
          ? "No permissions."
          : `Grants ${permissions.length} permissions, including ${permissions
              .slice(0, 3)
              .map((permission) => PERMISSION_LABELS[permission].toLowerCase())
              .join(", ")}.`,
      ];
    }),
  ) as Record<Role, string>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">Add user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an account and set what it can reach.
        </p>
      </div>

      <CreateUserForm roleHints={roleHints} teams={teams} />
    </div>
  );
}
