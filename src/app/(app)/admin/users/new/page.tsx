import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateUserForm } from "@/components/admin/create-user-form";
import type { Role } from "@/lib/domain";
import { PERMISSION_LABELS, permissionsFor } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Add user" };

export default async function NewUserPage() {
  await requirePermission("members.invite");

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
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to users
        </Link>
        <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight">Add user</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create an account and set what it can reach.
        </p>
      </div>

      <CreateUserForm roleHints={roleHints} />
    </div>
  );
}
