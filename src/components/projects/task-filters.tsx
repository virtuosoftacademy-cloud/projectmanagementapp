"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { PRIORITIES, type Label, type Member, type Task } from "@/lib/domain";

/** "Any" cannot be the empty string — Radix's Select rejects an empty value. */
export const ANY = "any";

export type TaskFilter = {
  search: string;
  assigneeId: string;
  labelId: string;
  priority: string;
  /** Archived tasks are hidden unless asked for. */
  includeArchived: boolean;
};

export const EMPTY_FILTER: TaskFilter = {
  search: "",
  assigneeId: ANY,
  labelId: ANY,
  priority: ANY,
  includeArchived: false,
};

export function isFiltered(filter: TaskFilter) {
  return (
    filter.search.trim() !== "" ||
    filter.assigneeId !== ANY ||
    filter.labelId !== ANY ||
    filter.priority !== ANY ||
    filter.includeArchived
  );
}

/**
 * Narrows an already-loaded list of tasks.
 *
 * Filtering happens in the browser rather than by re-querying: the board has
 * every task in hand already, so a round trip per keystroke would buy nothing
 * but latency. A workspace large enough for that to matter would want server-
 * side paging first, which is a different change.
 */
export function filterTasks<T extends Task & { projectName?: string }>(
  tasks: T[],
  filter: TaskFilter,
): T[] {
  const needle = filter.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (!filter.includeArchived && task.archived) return false;
    if (filter.priority !== ANY && task.priority !== filter.priority) return false;
    if (filter.assigneeId !== ANY && !task.assignees.some((p) => p.id === filter.assigneeId)) {
      return false;
    }
    if (filter.labelId !== ANY && !task.labels.some((l) => l.id === filter.labelId)) return false;

    if (needle) {
      const haystack = [task.title, task.description, task.projectName ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

/** The filter bar above a board or list. */
export function TaskFilters({
  filter,
  onChange,
  members,
  labels,
  resultCount,
  totalCount,
  allowArchived = true,
}: {
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
  members: Member[];
  labels: Label[];
  resultCount: number;
  totalCount: number;
  /**
   * Whether to offer "Show archived". A board has nowhere to put an archived
   * card — it is off every list by definition — so boards turn this off.
   */
  allowArchived?: boolean;
}) {
  const set = <K extends keyof TaskFilter>(key: K, value: TaskFilter[K]) =>
    onChange({ ...filter, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs -mt-3">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={filter.search}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="h-9 pl-8"
          onChange={(event) => set("search", event.target.value)}
        />
      </div>

      <SelectField
        value={filter.assigneeId}
        aria-label="Filter by assignee"
        className="h-9 w-[10rem] text-xs"
        onValueChange={(value) => set("assigneeId", value)}
        options={[
          { value: ANY, label: "Anyone" },
          ...members.map((member) => ({ value: member.id, label: member.name })),
        ]}
      />

      {labels.length ? (
        <SelectField
          value={filter.labelId}
          aria-label="Filter by label"
          className="h-9 w-[9rem] text-xs"
          onValueChange={(value) => set("labelId", value)}
          options={[
            { value: ANY, label: "Any label" },
            ...labels.map((label) => ({ value: label.id, label: label.name })),
          ]}
        />
      ) : null}

      <SelectField
        value={filter.priority}
        aria-label="Filter by priority"
        className="h-9 w-[9rem] text-xs capitalize"
        onValueChange={(value) => set("priority", value)}
        options={[
          { value: ANY, label: "Any priority" },
          ...PRIORITIES.map((priority) => ({ value: priority, label: priority })),
        ]}
      />

      {allowArchived ? (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={filter.includeArchived}
            onCheckedChange={(checked) => set("includeArchived", checked === true)}
          />
          Show archived
        </label>
      ) : null}

      {isFiltered(filter) ? (
        <>
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {resultCount} of {totalCount}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTER)}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </>
      ) : null}
    </div>
  );
}
