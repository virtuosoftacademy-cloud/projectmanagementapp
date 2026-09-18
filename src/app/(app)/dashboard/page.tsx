import type { Metadata } from "next";
import {
  CircleAlert,
  Clock,
  Download,
  FolderKanban,
  SquareCheckBig,
  Users,
  Wallet,
} from "lucide-react";
import { ActivityTab } from "@/components/dashboard/activity-tab";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { ProjectsTab } from "@/components/dashboard/projects-tab";
import {
  TeamBreakdown,
  type TeamBreakdownRow,
} from "@/components/dashboard/team-breakdown";
import { TeamTab } from "@/components/dashboard/team-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabbedPanel } from "@/components/ui/tabbed-panel";
import { can } from "@/lib/permissions";
import {
  getActivity,
  getMemberStats,
  getMembers,
  getMetrics,
  getProjectStats,
  getProjects,
  getTeams,
} from "@/lib/queries";
import { projectScope, requirePage } from "@/lib/session";
import { formatPkr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Workspace overview: projects, tasks and hours.",
};

export default async function DashboardPage() {
  const viewer = await requirePage("dashboard");
  const [metrics, projects, members, activity, teams] = await Promise.all([
    getMetrics(viewer.workspaceId),
    getProjects(viewer.workspaceId, await projectScope()),
    getMembers(viewer.workspaceId),
    getActivity(viewer.workspaceId),
    getTeams(viewer.workspaceId),
  ]);

  const projectRows = await Promise.all(
    projects.map(async (project) => ({
      project,
      stats: await getProjectStats(viewer.workspaceId, project.id),
    })),
  );
  const memberRows = await Promise.all(
    members.map(async (member) => ({
      member,
      stats: await getMemberStats(viewer.workspaceId, member.id),
    })),
  );

  /**
   * Per-team totals, summed from the project and member data already loaded
   * above rather than queried again — so the roll-up and the cards below it
   * always agree.
   *
   * People and projects with no team are collected into one trailing bucket,
   * which is only shown when it actually holds something.
   */
  const unassigned = {
    memberCount: members.filter((member) => member.teamId === null).length,
    projects: projectRows.filter((row) => row.project.teamId === null),
  };

  const teamRows: TeamBreakdownRow[] = [
    ...teams.map((team) => {
      const owned = projectRows.filter((row) => row.project.teamId === team.id);
      return {
        id: team.id,
        name: team.name,
        color: team.color,
        memberCount: members.filter((member) => member.teamId === team.id).length,
        projectCount: owned.length,
        tasksDone: owned.reduce((sum, row) => sum + row.stats.done, 0),
        tasksTotal: owned.reduce((sum, row) => sum + row.stats.taskCount, 0),
        hours: owned.reduce((sum, row) => sum + row.stats.hours, 0),
        cost: owned.reduce((sum, row) => sum + row.stats.cost, 0),
        unassigned: false,
      };
    }),
    ...(unassigned.memberCount > 0 || unassigned.projects.length > 0
      ? [
          {
            id: "__unassigned",
            name: "No team",
            color: "transparent",
            memberCount: unassigned.memberCount,
            projectCount: unassigned.projects.length,
            tasksDone: unassigned.projects.reduce((sum, row) => sum + row.stats.done, 0),
            tasksTotal: unassigned.projects.reduce((sum, row) => sum + row.stats.taskCount, 0),
            hours: unassigned.projects.reduce((sum, row) => sum + row.stats.hours, 0),
            cost: unassigned.projects.reduce((sum, row) => sum + row.stats.cost, 0),
            unassigned: true,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {viewer.name.split(" ")[0]} — here&apos;s the full pulse of your
            workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Live
          </Badge>
          {can(viewer.role, "reports.view") ? (
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Export Report
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={FolderKanban}
          tone="primary"
          delta={12}
          value={metrics.activeProjects.toString()}
          label="Active Projects"
          hint={`${metrics.totalProjects} total`}
        />
        <KpiCard
          icon={SquareCheckBig}
          tone="success"
          delta={5}
          value={`${metrics.completionRate}%`}
          label="Task Completion"
          hint={`${metrics.tasksDone}/${metrics.tasksTotal} done`}
        />
        <KpiCard
          icon={Clock}
          tone="warning"
          delta={8}
          value={metrics.hoursTracked.toString()}
          label="Hours Tracked"
          hint={`${metrics.billablePercent}% billable`}
        />
        <KpiCard
          icon={Wallet}
          tone="primary"
          delta={18}
          value={formatPkr(metrics.billableRevenue)}
          label="Billable Revenue"
          hint={`Cost ${formatPkr(metrics.cost)}`}
        />
        <KpiCard
          icon={Users}
          tone="muted"
          value={metrics.memberCount.toString()}
          label="Team Members"
          hint={`${metrics.teamCount} teams`}
        />
        <KpiCard
          icon={CircleAlert}
          tone="destructive"
          value={metrics.overdueCount.toString()}
          label="Overdue Tasks"
          hint="Need attention"
        />
      </div>

      <TabbedPanel
        items={[
          {
            value: "overview",
            label: "Overview",
            content: <OverviewTab workspaceId={viewer.workspaceId} />,
          },
          { value: "projects", label: "Projects", content: <ProjectsTab rows={projectRows} /> },
          {
            value: "team",
            label: "Team",
            content: (
              <div className="space-y-6">
                <TeamBreakdown rows={teamRows} />
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold">By person</h2>
                  <TeamTab rows={memberRows} />
                </div>
              </div>
            ),
          },
          { value: "activity", label: "Activity", content: <ActivityTab entries={activity} /> },
        ]}
      />
    </div>
  );
}
