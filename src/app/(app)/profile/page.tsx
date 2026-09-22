import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FolderKanban, SquareCheckBig } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Field } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { TabbedPanel } from "@/components/ui/tabbed-panel";
import { roleLabel } from "@/lib/permissions";
import { getMember, getMemberStats, getProjectStats, getProjects } from "@/lib/queries";
import { projectScope, requirePage } from "@/lib/session";
import { statusVariant } from "@/lib/status";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const viewer = await requirePage("profile");
  const [stats, profile, projects] = await Promise.all([
    getMemberStats(viewer.workspaceId, viewer.id),
    getMember(viewer.workspaceId, viewer.id),
    getProjects(viewer.workspaceId, await projectScope()),
  ]);

  const myProjects = projects.filter((project) =>
    project.members.some((person) => person.id === viewer.id),
  );
  const projectStats = await Promise.all(
    myProjects.map(async (project) => ({
      project,
      stats: await getProjectStats(viewer.workspaceId, project.id),
    })),
  );
  const projectName = (id: string) => projects.find((project) => project.id === id)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage your personal information
        </p>
      </div>

      <Card className="shadow-none">
        <CardContent className="py-4 px-6">
          <div className="flex flex-col justify-between items-start gap-5 sm:flex-row">
            <ImageUpload
              kind="avatar"
              shape="round"
              label="Profile photo"
              currentUrl={profile?.image ?? null}
              className="w-full sm:max-w-md flex-1"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{viewer.name}</h2>
                <Badge variant="outline">{roleLabel(viewer.role)}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{viewer.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={<FolderKanban className="h-4 w-4 text-primary" />} value={myProjects.length} label="Projects" />
        <Tile icon={<SquareCheckBig className="h-4 w-4 text-primary" />} value={stats.tasksTotal} label="Tasks" />
        <Tile icon={<SquareCheckBig className="h-4 w-4 text-primary" />} value={stats.tasksDone} label="Completed" />
        <Tile icon={<Clock className="h-4 w-4 text-primary" />} value={stats.hours} label="Hours Logged" />
      </div>

      <TabbedPanel
        items={[
          {
            value: "details",
            label: "Details",
            content: (
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Display Name">
                      <Input defaultValue={viewer.name} />
                    </Field>
                    <Field label="Email" hint="Email cannot be changed">
                      <Input defaultValue={viewer.email} disabled />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Monthly Hours">
                      <Input type="number" defaultValue={profile?.monthlyHours ?? 0} />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            ),
          },
          {
            value: "projects",
            label: "Projects",
            content: (
              <div className="space-y-2">
                {projectStats.map(({ project, stats: projectStat }) => (
                  <Card key={project.id} className="shadow-none">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/projects/project/${project.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress
                          value={projectStat.progress}
                          aria-label={`${project.name} progress`}
                        />
                        <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                          {projectStat.progress}%
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {projectStat.done}/{projectStat.taskCount} tasks · {projectStat.hours}h
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {projectStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not on any project yet.</p>
                ) : null}
              </div>
            ),
          },
          {
            value: "tasks",
            label: "Tasks",
            content: (
              <div className="space-y-2">
                {stats.tasks.map((task) => (
                  <Card key={task.id} className="shadow-none">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {projectName(task.projectId)}
                        </p>
                      </div>
                      <Badge variant="secondary">{task.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
                {stats.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks assigned.</p>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function Tile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
          {icon}
        </div>
        <div>
          <p className="font-mono text-xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
