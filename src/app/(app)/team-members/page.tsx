import type { Metadata } from "next";
import { ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { AddMemberDialog } from "@/components/admin/add-member-dialog";
import { UsersTable } from "@/components/admin/users-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { getAddableUsers, getTeamMembers } from "@/lib/admin";
import { can } from "@/lib/permissions";
import { getTeams } from "@/lib/queries";
import { requirePage } from "@/lib/session";

export const metadata: Metadata = { title: "Team Members" };

/**
 * The workspace roster: everyone an owner or admin has added to this workspace.
 *
 * Distinct from Administration → Users, which lists *every* account in the
 * system so an admin can find someone who is not a member yet. Here, holding a
 * `WorkspaceMember` row is the entry condition — `getTeamMembers` filters to it
 * — so nobody appears who was not deliberately added.
 *
 * Read-only by design: `UsersTable` is rendered with both permission flags off,
 * so it drops the selection checkboxes, the role dropdown and the row actions.
 * Managing people stays on the Administration screen, which is where the
 * permission to do it is granted. Passing the flags rather than a second
 * component means the roster and the directory cannot drift apart.
 */
export default async function TeamMembersPage() {
  // Every role may see who is on the team — the same rule the sidebar applies
  // by putting this under Navigation rather than Administration.
  const viewer = await requirePage("team-members");

  const canInvite = can(viewer.role, "members.invite");

  const [members, teams, addable] = await Promise.all([
    getTeamMembers(viewer.workspaceId),
    getTeams(viewer.workspaceId),
    // Only owners and admins see the dialog, so only they need its candidates.
    canInvite ? getAddableUsers(viewer.workspaceId) : Promise.resolve([]),
  ]);
  const active = members.filter((member) => member.active).length;
  const privileged = members.filter(
    (member) => member.role === "owner" || member.role === "admin",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Team Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone added to this workspace by an owner or admin
          </p>
        </div>

        {/*
          Gated on the same permission the action re-checks server-side. Adding
          people is the one management action offered here — changing roles and
          disabling accounts stay on Administration → Users.
        */}
        {canInvite ? (
          <AddMemberDialog
            users={addable.map((user) => ({
              id: user.id,
              name: user.name,
              email: user.email,
            }))}
            teams={teams}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="primary"
          value={members.length.toString()}
          label="Team Members"
          hint="In this workspace"
        />
        <KpiCard
          icon={UserCheck}
          tone="success"
          value={active.toString()}
          label="Active"
          hint="Can sign in"
        />
        <KpiCard
          icon={UserX}
          tone="destructive"
          value={(members.length - active).toString()}
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
        users={members}
        teams={teams}
        canInvite={false}
        canAssignRoles={false}
        customRoles={[]}
        canManageRoles={false}
        canDelete={false}
        currentUserId={viewer.id}
      />
    </div>
  );
}
