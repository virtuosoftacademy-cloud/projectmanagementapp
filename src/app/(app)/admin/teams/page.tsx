import type { Metadata } from "next";
import { TeamsGrid, type TeamCard } from "@/components/teams/teams-grid";
import { can } from "@/lib/permissions";
import { getMembers, getMetrics, getTeamStats, getTeams } from "@/lib/queries";
import { requirePage } from "@/lib/session";

export const metadata: Metadata = { title: "Teams" };

/**
 * Teams administration. Owner/admin only — `workspace.settings`, the same
 * permission `createTeamAction`, `updateTeamAction` and `deleteTeamAction`
 * enforce, so what you can reach matches what you can do.
 *
 * The sidebar already hides this under Administration for other roles; the gate
 * is what stops someone reaching it by typing the URL.
 */
export default async function AdminTeamsPage() {
  const viewer = await requirePage("teams");
  const [metrics, teams, members] = await Promise.all([
    getMetrics(viewer.workspaceId),
    getTeams(viewer.workspaceId),
    getMembers(viewer.workspaceId),
  ]);

  const cards: TeamCard[] = await Promise.all(
    teams.map(async (team) => {
      const stats = await getTeamStats(viewer.workspaceId, team.id);
      return {
        ...team,
        members: members.filter((member) => stats.memberIds.includes(member.id)),
        activeMemberCount: stats.activeMemberCount,
        projectCount: stats.projectCount,
        taskCount: stats.taskCount,
        done: stats.done,
        progress: stats.progress,
      };
    }),
  );

  return (
    <TeamsGrid
      teams={cards}
      members={members}
      memberCount={metrics.memberCount}
      tasksDone={metrics.tasksDone}
      tasksTotal={metrics.tasksTotal}
      canManage={can(viewer.role, "workspace.settings")}
    />
  );
}
