"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Circle,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SquareCheckBig,
  Trash2,
} from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/lib/actions";
import {
  COLOR_SWATCHES,
  PROJECT_STATUSES,
  formatDay,
  type Member,
  type Project,
  type ProjectStatus,
  type Team,
} from "@/lib/domain";
import { statusVariant } from "@/lib/status";
import { cn } from "@/lib/utils";

export type ProjectCard = Project & { done: number; taskCount: number };

export function ProjectsGrid({
  projects,
  members,
  teams,
  canCreate,
  canEdit,
  canDelete,
  stats,
}: {
  projects: ProjectCard[];
  members: Member[];
  teams: Team[];
  canCreate: boolean;
  /** `projects.edit` — the ⋯ menu's Edit. */
  canEdit: boolean;
  /** `projects.delete` — its Delete. */
  canDelete: boolean;
  /** Summary cards rendered between the header and the project grid. */
  stats: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ProjectCard | null>(null);
  const [removing, setRemoving] = useState<ProjectCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [teamId, setTeamId] = useState("all");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (status !== "all" && project.status !== status) return false;
      if (teamId !== "all" && (project.teamId ?? "") !== (teamId === "none" ? "" : teamId)) {
        return false;
      }
      if (!term) return true;
      return (
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term)
      );
    });
  }, [projects, search, status, teamId]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onDone: () => void) {
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
      if (result.ok) {
        onDone();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">All projects in your workspace</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)} disabled={pending}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {stats}

      {projects.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1 ">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              value={search}
              aria-label="Search projects"
              placeholder="Search projects…"
              className="h-9 pl-8"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <SelectField
            value={status}
            aria-label="Filter by status"
            className="h-9 w-40"
            onValueChange={setStatus}
            options={[
              { value: "all", label: "Any status" },
              ...PROJECT_STATUSES.map((value) => ({
                value,
                label: value.replace("-", " "),
              })),
            ]}
          />

          <SelectField
            value={teamId}
            aria-label="Filter by team"
            className="h-9 w-44"
            onValueChange={setTeamId}
            options={[
              { value: "all", label: "Any team" },
              ...teams.map((team) => ({ value: team.id, label: team.name })),
              { value: "none", label: "No team" },
            ]}
          />

          {/* <span className="text-xs text-muted-foreground">
            {visible.length === projects.length
              ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
              : `${visible.length} of ${projects.length}`}
          </span> */}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((project) => (
          <Card key={project.id} className="transition-shadow hover:shadow-md">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Circle
                    className="h-3 w-3 shrink-0"
                    style={{ color: project.color, fill: project.color }}
                  />
                  <Link
                    href={`/projects/project/${project.id}`}
                    className="truncate font-semibold hover:underline"
                  >
                    {project.name}
                  </Link>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                  {canEdit || canDelete ? (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={pending}
                          aria-label={`Actions for ${project.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        {canEdit ? (
                          <DropdownMenuItem onSelect={() => setEditing(project)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                        ) : null}
                        {canDelete ? (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setRemoving(project)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {project.description || "No description."}
              </p>

              <Progress
                value={project.taskCount ? Math.round((project.done / project.taskCount) * 100) : 0}
                aria-label={`${project.name} task progress`}
                className="h-1.5"
              />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <SquareCheckBig className="h-3.5 w-3.5" />
                  <span className="font-mono">
                    {project.done}/{project.taskCount}
                  </span>{" "}
                  tasks
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="font-mono">
                    {project.endDate ? formatDay(project.endDate) : "—"}
                  </span>
                </span>
              </div>

              <AvatarStack people={project.members} />
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <FolderPlus aria-hidden className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A project holds the boards, tasks and time behind a piece of work.
          </p>
          {canCreate ? (
            <Button className="mt-4" onClick={() => setCreating(true)} disabled={pending}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No project matches those filters.
        </p>
      ) : null}

      <ProjectDialog
        key={String(creating)}
        open={creating}
        pending={pending}
        onClose={() => setCreating(false)}
        members={members}
        teams={teams}
        onSubmit={(draft) => run(() => createProjectAction(draft), () => setCreating(false))}
      />

      {editing ? (
        <ProjectDialog
          key={editing.id}
          open
          project={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          members={members}
          teams={teams}
          onSubmit={(draft) =>
            run(() => updateProjectAction({ ...draft, id: editing.id }), () => setEditing(null))
          }
        />
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const project = removing;
          if (!project) return;
          setRemoving(null);
          run(() => deleteProjectAction(project.id), () => undefined);
        }}
        confirmLabel="Delete"
        title={`Delete ${removing?.name ?? "project"}?`}
        description={
          removing?.taskCount
            ? `Its ${removing.taskCount} tasks go with it, along with their subtasks, files and logged time. This cannot be undone.`
            : "Its boards, sheets and campaigns go with it. This cannot be undone."
        }
      />
    </div>
  );
}

type ProjectDraft = {
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  teamId: string;
  startDate: string;
  endDate: string;
  memberIds: string[];
};

function ProjectDialog({
  open,
  project,
  pending,
  onClose,
  onSubmit,
  members,
  teams,
}: {
  open: boolean;
  /** The project being edited, or nothing when creating one. */
  project?: ProjectCard;
  pending: boolean;
  onClose: () => void;
  onSubmit: (draft: ProjectDraft) => void;
  members: Member[];
  teams: Team[];
}) {
  const [draft, setDraft] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    status: project?.status ?? ("planning" as ProjectStatus),
    color: project?.color ?? COLOR_SWATCHES[0],
    teamId: project?.teamId ?? "",
    startDate: project?.startDate ?? "",
    endDate: project?.endDate ?? "",
    memberIds: project?.members.map((person) => person.id) ?? ([] as string[]),
  });

  const [showAllMembers, setShowAllMembers] = useState(false);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  /**
   * Picking an owning team narrows the picker to that team, since that is who
   * usually staffs the project. Anyone already ticked stays listed even when
   * they fall outside the filter — otherwise switching team would strand a
   * selection that cannot be seen or removed.
   */
  const visibleMembers = useMemo(() => {
    if (showAllMembers || !draft.teamId) return members;
    return members.filter(
      (member) => member.teamId === draft.teamId || draft.memberIds.includes(member.id),
    );
  }, [members, showAllMembers, draft.teamId, draft.memberIds]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "Create Project"}
      description={
        project
          ? "Change this project's details. Its colour and members are set on the project itself."
          : "Add a new project to your workspace."
      }
      className="max-w-xl"
    >
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(draft);
        }}
      >
        <Field label="Name" required>
          <Input
            required
            value={draft.name}
            placeholder="e.g. Marketing Site"
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={draft.description}
            placeholder="What is this project about?"
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>

        <Field label="Status">
          <SelectField
            value={draft.status}
            className="capitalize"
            onValueChange={(value) => set("status", value as ProjectStatus)}
            options={PROJECT_STATUSES.map((status) => ({ value: status, label: status }))}
          />
        </Field>

        <Field label="Owning team">
          <SelectField
            value={draft.teamId}
            onValueChange={(value) => set("teamId", value)}
            placeholder="No team"
            options={teams.map((team) => ({ value: team.id, label: team.name }))}
          />
        </Field>

        <fieldset>
          <legend className="mb-4 text-sm font-medium leading-none">Color</legend>
          <div className="flex items-center gap-2">
            {COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => set("color", color)}
                aria-label={`Use color ${color}`}
                aria-pressed={draft.color === color}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform",
                  draft.color === color
                    ? "scale-110 border-foreground"
                    : "border-transparent hover:scale-105",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start Date">
            <Input
              type="date"
              value={draft.startDate}
              onChange={(event) => set("startDate", event.target.value)}
            />
          </Field>
          <Field label="End Date">
            <Input
              type="date"
              value={draft.endDate}
              onChange={(event) => set("endDate", event.target.value)}
            />
          </Field>
        </div>

        <fieldset>
          <div className="mb-4 flex items-center justify-between gap-2">
            <legend className="text-sm font-medium leading-none">
              Members ({draft.memberIds.length} selected)
            </legend>
            {draft.teamId ? (
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={showAllMembers}
                  onCheckedChange={(checked) => setShowAllMembers(checked === true)}
                  className="size-3.5"
                />
                Show everyone
              </label>
            ) : null}
          </div>

          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
            {visibleMembers.length === 0 ? (
              <p className="p-1.5 text-sm text-muted-foreground">
                Nobody is on that team yet — tick “Show everyone” to pick from the whole
                workspace.
              </p>
            ) : (
              visibleMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={draft.memberIds.includes(member.id)}
                    onCheckedChange={() =>
                      set(
                        "memberIds",
                        draft.memberIds.includes(member.id)
                          ? draft.memberIds.filter((id) => id !== member.id)
                          : [...draft.memberIds, member.id],
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{member.name}</span>
                  {/* Only worth labelling when the list is not already one team. */}
                  {showAllMembers || !draft.teamId ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {member.teamId
                        ? (teamNameById.get(member.teamId) ?? "Other team")
                        : "No team"}
                    </span>
                  ) : null}
                </label>
              ))
            )}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions
            onCancel={onClose}
            submitLabel={project ? "Save changes" : "Create Project"}
            disabled={pending}
          />
        </div>
      </form>
    </FormDialog>
  );
}
