import type { Metadata } from "next";
import { ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { UsersTable } from "@/components/admin/users-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getAdminUsers, getCustomRoles, getUserStats } from "@/lib/admin";
import { can } from "@/lib/permissions";
import { getTeams } from "@/lib/queries";
import { requirePage } from "@/lib/session";

export const metadata: Metadata = { title: "Users" };

/**
 * The account directory. Owner/admin only — `members.invite`.
 *
 * It was `requireUser` while this doubled as the everyone-can-see roster. That
 * roster now lives at `/team-members`, leaving this as a management screen: it
 * lists *every* account in the system, including people in other workspaces,
 * which is not something a member, viewer or guest should be able to enumerate.
 */
export default async function AdminUsersPage() {
  const viewer = await requirePage("users");
  const [users, stats, teams, customRoles] = await Promise.all([
    getAdminUsers(viewer.workspaceId),
    getUserStats(viewer.workspaceId),
    getTeams(viewer.workspaceId),
    getCustomRoles(viewer.workspaceId),
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
        canAssignRoles={can(viewer.role, "workspace.settings")}
        customRoles={customRoles}
        canManageRoles={can(viewer.role, "roles.manage")}
        canDelete={can(viewer.role, "members.delete")}
        currentUserId={viewer.id}
      />
    </div>
  );
}
