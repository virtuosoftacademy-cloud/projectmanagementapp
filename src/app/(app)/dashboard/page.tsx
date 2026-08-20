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
} from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { formatPkr } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Workspace overview: projects, tasks, hours, and billing.",
};

export default async function DashboardPage() {
  const viewer = await requireUser("/dashboard");
  const [metrics, projects, members, activity] = await Promise.all([
    getMetrics(viewer.workspaceId),
    getProjects(viewer.workspaceId),
    getMembers(viewer.workspaceId),
    getActivity(viewer.workspaceId),
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
          { value: "team", label: "Team", content: <TeamTab rows={memberRows} /> },
          { value: "activity", label: "Activity", content: <ActivityTab entries={activity} /> },
        ]}
      />
    </div>
  );
}
