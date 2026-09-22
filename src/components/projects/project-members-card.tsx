"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChartNoAxesColumn, Plus, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { addProjectMembersAction } from "@/lib/actions";
import type { Member, Team } from "@/lib/domain";

export type ProjectMemberRow = {
  member: Member;
  tasksDone: number;
  tasksTotal: number;
  hours: number;
};

export function ProjectMembersCard({
  projectId,
  rows,
  candidates,
  teams,
  owningTeamId,
  canEdit,
}: {
  projectId: string;
  rows: ProjectMemberRow[];
  /** Every workspace member; those already on the project are filtered out. */
  candidates: Member[];
  teams: Pick<Team, "id" | "name">[];
  /** The project's own team, listed first so it reads as the core group. */
  owningTeamId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<ProjectMemberRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const available = candidates.filter(
    (member) => !rows.some((row) => row.member.id === member.id),
  );

  const teamNameById = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  );

  /**
   * Rows bucketed by the member's team, so it is obvious who is core to the
   * project's own team and who was pulled in from elsewhere.
   *
   * Order: the owning team, then the remaining teams alphabetically, then the
   * unassigned. Members carry a single `teamId`, so every person lands in
   * exactly one bucket.
   */
  const groups = useMemo(() => {
    const byTeam = new Map<string, ProjectMemberRow[]>();
    for (const row of rows) {
      const key = row.member.teamId ?? "";
      const bucket = byTeam.get(key);
      if (bucket) bucket.push(row);
      else byTeam.set(key, [row]);
    }

    const label = (id: string) =>
      id ? (teamNameById.get(id) ?? "Other team") : "No team";

    return [...byTeam.entries()]
      .sort(([a], [b]) => {
        if (a === b) return 0;
        if (a === owningTeamId) return -1;
        if (b === owningTeamId) return 1;
        // Unassigned always sits at the bottom.
        if (a === "") return 1;
        if (b === "") return -1;
        return label(a).localeCompare(label(b));
      })
      .map(([id, members]) => ({
        id,
        label: label(id),
        isOwningTeam: Boolean(id) && id === owningTeamId,
        members,
      }));
  }, [rows, teamNameById, owningTeamId]);

  function add() {
    startTransition(async () => {
      const result = await addProjectMembersAction(projectId, selected);
      if (result.ok) {
        setSelected([]);
        setAdding(false);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <div className="flex! flex-row items-center justify-between px-6">
        <CardTitle className="text-sm">Members</CardTitle>
        <div>
          {canEdit ? (
            <Button variant="ghost" size="xs" onClick={() => setAdding(true)} disabled={pending}>
              <Plus className="h-3.5 w-3.5" />
              Add member
            </Button>
          ) : null}
        </div>
      </div>
      <CardContent className="space-y-4">
        {groups.map((group) => (
          <div key={group.id || "unassigned"} className="space-y-1">
            <p className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
              <Users className="h-3 w-3" />
              {group.label}
              <span className="font-mono">({group.members.length})</span>
              {group.isOwningTeam ? (
                <Badge variant="secondary" className="ml-1">
                  Owning team
                </Badge>
              ) : null}
            </p>

            {group.members.map(({ member, tasksDone, tasksTotal, hours }) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <UserAvatar
                  name={member.name}
                  className="h-9 w-9 bg-primary/10"
                  textClassName="text-xs text-primary"
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block max-w-full truncate rounded text-left text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Analytics for ${member.name}`}
                    onClick={() => setViewing({ member, tasksDone, tasksTotal, hours })}
                  >
                    {member.name}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="capitalize">{member.role}</span> · {member.email}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-mono font-medium">
                    {tasksDone}/{tasksTotal} tasks
                  </p>
                  <p className="font-mono text-muted-foreground">{hours.toFixed(1)}h logged</p>
                </div>
              </div>
            ))}
          </div>
        ))}

        {rows.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Nobody is on this project yet.</p>
        ) : null}
      </CardContent>

      {viewing ? (
        <FormDialog
          open
          onClose={() => setViewing(null)}
          title={viewing.member.name}
          description={`${viewing.member.designation ?? viewing.member.role} · ${viewing.member.email}`}
        >
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Tasks done</p>
                <p className="mt-1 font-mono text-xl font-bold">
                  {viewing.tasksDone}/{viewing.tasksTotal}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="mt-1 font-mono text-xl font-bold">
                  {viewing.tasksTotal
                    ? Math.round((viewing.tasksDone / viewing.tasksTotal) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Logged</p>
                <p className="mt-1 font-mono text-xl font-bold">{viewing.hours.toFixed(1)}h</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Their work on this project. Team:{" "}
              {viewing.member.teamId
                ? (teamNameById.get(viewing.member.teamId) ?? "Other team")
                : "No team"}
              .
            </p>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/team-members/${viewing.member.id}`}>
                  <ChartNoAxesColumn className="h-3.5 w-3.5" />
                  Full analytics
                </Link>
              </Button>
            </div>
          </div>
        </FormDialog>
      ) : null}

      <FormDialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add member"
        description="Pick workspace members to add to this project."
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
            {available.map((member) => (
              <label
                key={member.id}
                className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.includes(member.id)}
                  onCheckedChange={() =>
                    setSelected((current) =>
                      current.includes(member.id)
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id],
                    )
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{member.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {member.teamId
                    ? (teamNameById.get(member.teamId) ?? "Other team")
                    : "No team"}
                </span>
              </label>
            ))}
            {available.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                Everyone in the workspace is already on this project.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogActions
              onCancel={() => setAdding(false)}
              submitLabel="Add"
              disabled={selected.length === 0 || pending}
            />
          </div>
        </form>
      </FormDialog>
    </Card>
  );
}
