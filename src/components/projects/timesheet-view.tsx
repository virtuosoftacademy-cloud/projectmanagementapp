"use client";

import { useMemo, useState } from "react";
import { WeeklyTimesheet, type TimesheetRow } from "@/components/projects/weekly-timesheet";
import { SelectField } from "@/components/ui/select-field";
import { formatDuration } from "@/lib/utils";

/** One logged entry, flattened to what the grid needs. */
export type TimesheetEntry = {
  projectId: string;
  memberId: string;
  memberName: string;
  /** The member's team, or "" when they are on none. */
  teamId: string;
  /** ISO day. */
  date: string;
  hours: number;
};

const ALL = "all";
/** Radix rejects an empty value, so "no team" travels as a sentinel. */
const NO_TEAM = "none";

/**
 * The weekly grid with project and team filters above it.
 *
 * Rows are aggregated here rather than on the server so switching project is
 * instant: the entries are already loaded, and re-deriving them is a pass over
 * an array the viewer can already see. Filtering server-side would mean a round
 * trip for what is a view of data the page has in hand.
 *
 * Rows stay keyed by member in every mode — a timesheet answers "who worked how
 * long", and the project filter narrows which hours count, not what a row is.
 */
export function TimesheetView({
  entries,
  projects,
  teams,
  initialWeek,
}: {
  entries: TimesheetEntry[];
  /** Every project the viewer may see, whether or not it has hours logged. */
  projects: { id: string; name: string }[];
  /** Every team in the workspace, whether or not its people logged anything. */
  teams: { id: string; name: string }[];
  initialWeek: string;
}) {
  const [projectId, setProjectId] = useState<string>(ALL);
  const [teamId, setTeamId] = useState<string>(ALL);

  const visible = useMemo(
    () =>
      entries.filter((entry) => {
        if (projectId !== ALL && entry.projectId !== projectId) return false;
        if (teamId === ALL) return true;
        return entry.teamId === (teamId === NO_TEAM ? "" : teamId);
      }),
    [entries, projectId, teamId],
  );

  const rows = useMemo(() => {
    const byMember = new Map<string, TimesheetRow>();

    for (const entry of visible) {
      const row = byMember.get(entry.memberId) ?? {
        memberId: entry.memberId,
        name: entry.memberName,
        byDate: {},
      };
      row.byDate[entry.date] = (row.byDate[entry.date] ?? 0) + entry.hours;
      byMember.set(entry.memberId, row);
    }

    return [...byMember.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [visible]);

  const total = visible.reduce((sum, entry) => sum + entry.hours, 0);
  const selected = projects.find((project) => project.id === projectId);
  const selectedTeam = teams.find((team) => team.id === teamId);
  const scope = [
    selected ? selected.name : "all projects",
    teamId === ALL ? "" : selectedTeam ? `the ${selectedTeam.name} team` : "people with no team",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SelectField
          value={projectId}
          onValueChange={setProjectId}
          aria-label="Filter by project"
          className="w-[240px]"
          options={[
            { value: ALL, label: `All projects (${projects.length})` },
            ...projects.map((project) => ({ value: project.id, label: project.name })),
          ]}
        />

        <SelectField
          value={teamId}
          onValueChange={setTeamId}
          aria-label="Filter by team"
          className="w-[200px]"
          options={[
            { value: ALL, label: `All teams (${teams.length})` },
            ...teams.map((team) => ({ value: team.id, label: team.name })),
            { value: NO_TEAM, label: "No team" },
          ]}
        />

        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">
            {formatDuration(total)}
          </span>{" "}
          logged in {scope}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {/*
            An empty *filter* and an empty *timesheet* are different situations,
            and saying which one this is saves the reader checking.
          */}
          {projectId === ALL && teamId === ALL
            ? "No time has been logged on your projects yet."
            : `No time has been logged in ${scope} yet.`}
        </p>
      ) : (
        <WeeklyTimesheet rows={rows} initialWeek={initialWeek} />
      )}
    </div>
  );
}
