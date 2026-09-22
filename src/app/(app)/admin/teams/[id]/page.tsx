import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, Clock, FolderKanban, ListTodo, Users } from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TASK_STATUSES } from "@/lib/domain";
import { formatDuration } from "@/lib/utils";
import {
  getMemberStats,
  getMembers,
  getProjects,
  getTasks,
  getTeamStats,
  getTeams,
} from "@/lib/queries";
import { requirePage } from "@/lib/session";
import { roleLabel } from "@/lib/permissions";
import { statusVariant, taskStatusColor } from "@/lib/status";

export async function generateMetadata({
  params,
}: PageProps<"/admin/teams/[id]">): Promise<Metadata> {
  const { id } = await params;
  const viewer = await requirePage("teams");
  const team = (await getTeams(viewer.workspaceId)).find((item) => item.id === id);
  return { title: team ? `${team.name} — Analytics` : "Team" };
}

/** One team's analytics: who is on it, what it owns, and how far along it is. */
export default async function TeamAnalyticsPage({ params }: PageProps<"/admin/teams/[id]">) {
  const viewer = await requirePage("teams");
  const { id } = await params;

  const teams = await getTeams(viewer.workspaceId);
  const team = teams.find((item) => item.id === id);
  if (!team) notFound();

  const [stats, members, tasks, projects] = await Promise.all([
    getTeamStats(viewer.workspaceId, team.id),
    getMembers(viewer.workspaceId),
    getTasks(viewer.workspaceId),
    getProjects(viewer.workspaceId),
  ]);

  const people = members.filter((member) => stats.memberIds.includes(member.id));
  const teamProjects = projects.filter((project) => project.teamId === team.id);
  const teamTasks = tasks.filter((task) =>
    task.assignees.some((person) => stats.memberIds.includes(person.id)),
  );

  // Per-person figures come from the same aggregate the dashboard uses, so a
  // member's row here and their card there can never disagree.
  const rows = await Promise.all(
    people.map(async (member) => ({ member, stats: await getMemberStats(viewer.workspaceId, member.id) })),
  );

  const hours = rows.reduce((sum, row) => sum + row.stats.hoursExact, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to teams
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{team.name}</h1>
          <Badge variant="outline" className="font-mono">
            {team.code}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {team.description || "No description."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="primary"
          value={people.length.toString()}
          label="Members"
          hint={`${stats.activeMemberCount} can sign in`}
        />
        <KpiCard
          icon={FolderKanban}
          tone="accent"
          value={stats.projectCount.toString()}
          label="Projects"
          hint="Owned by this team"
        />
        <KpiCard
          icon={ListTodo}
          tone="warning"
          value={stats.taskCount.toString()}
          label="Tasks"
          hint={`${stats.done} done`}
        />
        <KpiCard
          icon={Clock}
          tone="success"
          value={formatDuration(hours)}
          label="Logged"
          hint="By its members"
        />
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm">Task progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Done</span>
              <span className="font-mono font-medium">
                {stats.done}/{stats.taskCount} • {stats.progress}%
              </span>
            </div>
            <Progress value={stats.progress} aria-label={`${team.name} task progress`} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TASK_STATUSES.map(({ status, label }) => {
              const count = teamTasks.filter((task) => task.status === status).length;
              return (
                <div key={status} className="rounded-md border p-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: taskStatusColor[status] }}
                    />
                    {label}
                  </span>
                  <p className="mt-1 font-mono text-xl font-bold">{count}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-sm">Members</CardTitle>
          <AvatarStack people={people} max={6} />
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is on this team yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.member.id}>
                    <TableCell>
                      <Link
                        href={`/team-members/${row.member.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.member.name}
                      </Link>
                    </TableCell>
                    <TableCell>{roleLabel(row.member.role)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {row.stats.tasksDone}/{row.stats.tasksTotal}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatDuration(row.stats.hoursExact)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm">Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {teamProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">This team owns no projects.</p>
          ) : (
            <ul className="divide-y">
              {teamProjects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-3 py-2">
                  <Link
                    href={`/projects/project/${project.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                  <Badge variant={statusVariant[project.status]} className="capitalize">
                    {project.status.replace("-", " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CircleCheck className="h-3.5 w-3.5" />
        Figures cover every task assigned to a member of this team, wherever it lives.
      </p>
    </div>
  );
}
