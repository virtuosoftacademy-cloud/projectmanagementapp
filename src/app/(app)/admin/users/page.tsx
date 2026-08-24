import type { Metadata } from "next";
import { ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { UsersTable } from "@/components/admin/users-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getAdminUsers, getUserStats } from "@/lib/admin";
import { can } from "@/lib/permissions";
import { getTeams } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  // Everyone signed in can see the roster; the management controls below are
  // gated per permission, and every action re-checks server-side.
  const viewer = await requireUser("/admin/users");
  const [users, stats, teams] = await Promise.all([
    getAdminUsers(viewer.workspaceId),
    getUserStats(viewer.workspaceId),
    getTeams(viewer.workspaceId),
  ]);

  const canInvite = can(viewer.role, "members.invite");
  const privileged = stats.byRole.owner + stats.byRole.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canInvite
            ? "Every account that can sign in to this workspace"
            : "Everyone in this workspace"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="primary"
          value={stats.total.toString()}
          label="Total Users"
          hint={`${stats.inWorkspace} in this workspace`}
        />
        <KpiCard
          icon={UserCheck}
          tone="success"
          value={stats.active.toString()}
          label="Active"
          hint="Can sign in"
        />
        <KpiCard
          icon={UserX}
          tone="destructive"
          value={stats.inactive.toString()}
          label="Disabled"
          hint="Sign-in blocked"
        />
        <KpiCard
          icon={ShieldCheck}
          tone="warning"
          value={privileged.toString()}
          label="Owners & Admins"
          hint="Elevated access"
        />
      </div>

      <UsersTable
        users={users}
        teams={teams}
        canInvite={canInvite}
        canManageRoles={can(viewer.role, "roles.manage")}
        currentUserId={viewer.id}
      />
    </div>
  );
}
