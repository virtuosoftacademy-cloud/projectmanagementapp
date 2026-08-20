"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Circle, Plus, SquareCheckBig } from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { createProjectAction } from "@/lib/actions";
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
  stats,
}: {
  projects: ProjectCard[];
  members: Member[];
  teams: Team[];
  canCreate: boolean;
  /** Summary cards rendered between the header and the project grid. */
  stats: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
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
                <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
              </div>

              <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

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

      <ProjectDialog
        key={String(creating)}
        open={creating}
        pending={pending}
        onClose={() => setCreating(false)}
        members={members}
        teams={teams}
        onSubmit={(draft) => {
          startTransition(async () => {
            const result = await createProjectAction(draft);
            setError(result.error ?? null);
            if (result.ok) {
              setCreating(false);
              router.refresh();
            }
          });
        }}
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
  pending,
  onClose,
  onSubmit,
  members,
  teams,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (draft: ProjectDraft) => void;
  members: Member[];
  teams: Team[];
}) {
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    status: "planning" as ProjectStatus,
    color: COLOR_SWATCHES[0],
    teamId: "",
    startDate: "",
    endDate: "",
    memberIds: [] as string[],
  });

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Create Project"
      description="Add a new project to your workspace."
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
          <legend className="mb-1.5 text-sm font-medium leading-none">Color</legend>
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
          <legend className="mb-1.5 text-sm font-medium leading-none">Members</legend>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={draft.memberIds.includes(member.id)}
                  onChange={() =>
                    set(
                      "memberIds",
                      draft.memberIds.includes(member.id)
                        ? draft.memberIds.filter((id) => id !== member.id)
                        : [...draft.memberIds, member.id],
                    )
                  }
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                {member.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions onCancel={onClose} submitLabel="Create Project" disabled={pending} />
        </div>
      </form>
    </FormDialog>
  );
}
