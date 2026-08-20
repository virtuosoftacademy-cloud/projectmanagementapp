import type { Metadata } from "next";
import { TeamsGrid, type TeamCard } from "@/components/teams/teams-grid";
import { can } from "@/lib/permissions";
import { getMembers, getMetrics, getTeamStats, getTeams } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Teams" };

export default async function AdminTeamsPage() {
  const viewer = await requireUser("/admin/teams");
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
