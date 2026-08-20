"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CircleAlert,
  CircleCheck,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { AvatarStack } from "@/components/avatar-stack";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { Progress } from "@/components/ui/progress";
import {
  createTeamAction,
  deleteTeamAction,
  updateTeamAction,
  type ActionResult,
} from "@/app/(app)/admin/teams/actions";
import { COLOR_SWATCHES, type Member, type Person, type Team } from "@/lib/domain";
import { cn, initials } from "@/lib/utils";

export type TeamCard = Team & {
  members: Person[];
  activeMemberCount: number;
  projectCount: number;
  taskCount: number;
  done: number;
  progress: number;
};

type Draft = {
  name: string;
  slug: string;
  code: string;
  description: string;
  color: string;
  leadId: string;
  memberIds: string[];
};

export function TeamsGrid({
  teams,
  members,
  memberCount,
  tasksDone,
  tasksTotal,
  canManage,
}: {
  teams: TeamCard[];
  members: Member[];
  memberCount: number;
  tasksDone: number;
  tasksTotal: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeamCard | null>(null);
  const [removing, setRemoving] = useState<TeamCard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const avgProgress = teams.length
    ? Math.round(teams.reduce((sum, team) => sum + team.progress, 0) / teams.length)
    : 0;

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      setNotice(result.error ?? null);
      if (result.ok) {
        onSuccess?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {teams.length} teams in this workspace
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setCreating(true)} disabled={pending}>
            <Plus className="h-4 w-4" />
            New Team
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Building2}
          tone="primary"
          value={teams.length.toString()}
          label="Teams"
          hint="Across workspace"
        />
        <KpiCard
          icon={Users}
          tone="success"
          value={memberCount.toString()}
          label="Total Members"
          hint="All teams"
        />
        <KpiCard
          icon={TrendingUp}
          tone="warning"
          value={`${avgProgress}%`}
          label="Avg Progress"
          hint="Task completion"
        />
        <KpiCard
          icon={CircleCheck}
          tone="accent"
          value={tasksDone.toString()}
          label="Tasks Done"
          hint={`Of ${tasksTotal}`}
        />
      </div>

      {notice ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="shadow-none transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <h2 className="truncate text-sm font-medium">{team.name}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {team.members.length}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <FolderKanban className="h-3 w-3" />
                    {team.projectCount}
                  </Badge>
                  {canManage ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        onClick={() => setEditing(team)}
                        aria-label={`Edit ${team.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending || team.activeMemberCount > 0 || team.projectCount > 0}
                        title={
                          team.activeMemberCount > 0 || team.projectCount > 0
                            ? "Move its active users and projects elsewhere first"
                            : undefined
                        }
                        onClick={() => setRemoving(team)}
                        aria-label={`Delete ${team.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Task progress</span>
                  <span className="font-mono font-medium">
                    {team.done}/{team.taskCount} • {team.progress}%
                  </span>
                </div>
                <Progress value={team.progress} aria-label={`${team.name} task progress`} />
              </div>

              <div className="flex items-center justify-between border-t pt-2">
                <AvatarStack people={team.members} />
                <Link
                  href="/admin/users"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  View
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeamDialog
        open={creating}
        onClose={() => setCreating(false)}
        members={members}
        title="Create New Team"
        description="Set up a team, assign a lead, and add members."
        submitLabel="Create Team"
        pending={pending}
        onSubmit={(draft) => run(() => createTeamAction(draft), () => setCreating(false))}
      />

      <TeamDialog
        key={editing?.id ?? "edit"}
        open={editing !== null}
        onClose={() => setEditing(null)}
        members={members}
        title="Edit Team"
        description="Update the team's details and membership."
        submitLabel="Save"
        team={editing ?? undefined}
        pending={pending}
        onSubmit={(draft) => {
          if (!editing) return;
          run(() => updateTeamAction({ ...draft, id: editing.id }), () => setEditing(null));
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          run(() => deleteTeamAction(removing.id));
        }}
        title={`Delete ${removing?.name ?? "team"}?`}
        description="Only teams with no active users and no projects can be deleted. Members keep their accounts."
      />
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function TeamDialog({
  open,
  pending,
  onClose,
  onSubmit,
  members,
  title,
  description,
  submitLabel,
  team,
}: {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (draft: Draft) => void;
  members: Member[];
  title: string;
  description: string;
  submitLabel: string;
  team?: TeamCard;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: team?.name ?? "",
    slug: team ? slugify(team.name) : "",
    code: team?.name.slice(0, 4).toUpperCase() ?? "",
    description: "",
    color: team?.color ?? COLOR_SWATCHES[0],
    leadId: team?.leadId ?? "",
    memberIds: team?.members.map((member) => member.id) ?? [],
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(team));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function toggleMember(id: string) {
    setDraft((current) => ({
      ...current,
      memberIds: current.memberIds.includes(id)
        ? current.memberIds.filter((item) => item !== id)
        : [...current.memberIds, id],
    }));
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="max-w-xl"
    >
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(draft);
        }}
      >
        <Field label="Team Name" required>
          <Input
            required
            value={draft.name}
            placeholder="e.g. Marketing"
            onChange={(event) => {
              const name = event.target.value;
              setDraft((current) => ({
                ...current,
                name,
                slug: slugTouched ? current.slug : slugify(name),
              }));
            }}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug" hint="URL-friendly identifier" required>
            <Input
              required
              value={draft.slug}
              placeholder="marketing"
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value);
              }}
            />
          </Field>
          <Field label="Team Code" hint="2–6 chars, A–Z / 0–9" required>
            <Input
              required
              maxLength={6}
              pattern="[A-Za-z0-9]{2,6}"
              value={draft.code}
              placeholder="MKTG"
              onChange={(event) => set("code", event.target.value.toUpperCase())}
            />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            value={draft.description}
            placeholder="What does this team focus on?"
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium leading-none">Team Color</legend>
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

        <Field label="Team Lead">
          <SelectField
            value={draft.leadId}
            onValueChange={(value) => set("leadId", value)}
            placeholder="Select a team lead"
            options={members.map((member) => ({ value: member.id, label: member.name }))}
          />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium leading-none">
            Members ({draft.memberIds.length} selected)
          </legend>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={draft.memberIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <Avatar name={member.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{member.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </span>
                <Badge variant="outline">{member.role}</Badge>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions onCancel={onClose} submitLabel={submitLabel} disabled={pending} />
        </div>
      </form>
    </FormDialog>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
      {initials(name)}
    </span>
  );
}
