import { eachDayOfInterval, format, max, parseISO, subDays } from "date-fns";
import type { Person, Subtask, TaskEntry, TaskStatus } from "@/lib/domain";
import { buildSubtaskTree, countByStatus, flattenTree, type SubtaskNode } from "@/lib/subtask-tree";

/**
 * The numbers behind one task's analytics page.
 *
 * Pure: it takes the task's subtasks and time entries and derives everything
 * from them, so the page does no arithmetic of its own and this can be tested
 * without a database.
 */

/** The longest stretch the day chart covers, so a years-old task stays readable. */
export const MAX_CHART_DAYS = 60;

export type PersonTime = {
  person: Person;
  minutes: number;
  entries: number;
  /** Share of the task's logged time, 0–100. */
  share: number;
  /** Where their time went, by top-level branch; largest first. */
  branches: { title: string; minutes: number }[];
};

export type TaskAnalytics = {
  totalMinutes: number;
  /** Logged against a subtask, at any depth. */
  onSubtasksMinutes: number;
  /** Logged on the task as a whole, or on a subtask since deleted. */
  onTaskMinutes: number;
  subtaskCount: number;
  doneCount: number;
  /** Subtasks done, 0–100. */
  percentDone: number;
  statusCounts: Record<TaskStatus, number>;
  /** The tree, flattened parents-first, each node carrying its branch totals. */
  rows: SubtaskNode[];
  people: PersonTime[];
  days: { date: string; label: string; hours: number }[];
  /** True when older days were left off the chart. */
  daysTruncated: boolean;
};

/** Label for time not on any (surviving) subtask. */
export const WHOLE_TASK_LABEL = "The task itself";

export function computeTaskAnalytics({
  subtasks,
  entries,
  today,
}: {
  subtasks: Subtask[];
  entries: TaskEntry[];
  /** `yyyy-mm-dd`, from the server, so the chart ends on the same day everywhere. */
  today: string;
}): TaskAnalytics {
  const tree = buildSubtaskTree(subtasks);
  const rows = flattenTree(tree);

  // Every node mapped to the top-level branch it sits in, so a person's time
  // can be grouped by branch however deep they logged it.
  const branchOf = new Map<string, string>();
  for (const root of tree) {
    for (const node of flattenTree([root])) branchOf.set(node.id, root.title);
  }

  const totalMinutes = entries.reduce((sum, entry) => sum + minutesOf(entry), 0);
  // An entry whose subtask was deleted has lost its link (SetNull), so it
  // counts as time on the task — which is where the delete promised it stays.
  const onSubtasksMinutes = entries
    .filter((entry) => entry.subtaskId && branchOf.has(entry.subtaskId))
    .reduce((sum, entry) => sum + minutesOf(entry), 0);

  const statusCounts = countByStatus(subtasks);
  const doneCount = statusCounts.done;

  return {
    totalMinutes,
    onSubtasksMinutes,
    onTaskMinutes: totalMinutes - onSubtasksMinutes,
    subtaskCount: subtasks.length,
    doneCount,
    percentDone: subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : 0,
    statusCounts,
    rows,
    people: timeByPerson(entries, branchOf, totalMinutes),
    ...timeByDay(entries, today),
  };
}

function minutesOf(entry: TaskEntry) {
  return Math.round(entry.hours * 60);
}

function timeByPerson(
  entries: TaskEntry[],
  branchOf: Map<string, string>,
  totalMinutes: number,
): PersonTime[] {
  const byPerson = new Map<string, { person: Person; minutes: number; entries: number; branches: Map<string, number> }>();

  for (const entry of entries) {
    const current = byPerson.get(entry.userId) ?? {
      person: entry.user,
      minutes: 0,
      entries: 0,
      branches: new Map<string, number>(),
    };
    const minutes = minutesOf(entry);
    const branch = (entry.subtaskId && branchOf.get(entry.subtaskId)) || WHOLE_TASK_LABEL;
    current.minutes += minutes;
    current.entries += 1;
    current.branches.set(branch, (current.branches.get(branch) ?? 0) + minutes);
    byPerson.set(entry.userId, current);
  }

  return [...byPerson.values()]
    .map((item) => ({
      person: item.person,
      minutes: item.minutes,
      entries: item.entries,
      share: totalMinutes ? Math.round((item.minutes / totalMinutes) * 100) : 0,
      branches: [...item.branches]
        .map(([title, minutes]) => ({ title, minutes }))
        .sort((a, b) => b.minutes - a.minutes),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Hours per day from the first entry to today, days with nothing included —
 * a gap in the work should look like a gap, not be skipped over.
 */
function timeByDay(entries: TaskEntry[], today: string) {
  if (!entries.length) return { days: [], daysTruncated: false };

  const end = parseISO(today);
  const first = entries.reduce((earliest, entry) => (entry.date < earliest ? entry.date : earliest), today);
  const earliestShown = subDays(end, MAX_CHART_DAYS - 1);
  const start = max([parseISO(first), earliestShown]);

  const minutesByDay = new Map<string, number>();
  for (const entry of entries) {
    minutesByDay.set(entry.date, (minutesByDay.get(entry.date) ?? 0) + minutesOf(entry));
  }

  // An entry dated after today (a manual entry can be) still ends the chart.
  const last = entries.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), today);

  const days = eachDayOfInterval({ start, end: parseISO(last) }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    return {
      date,
      label: format(day, "MMM d"),
      hours: Math.round(((minutesByDay.get(date) ?? 0) / 60) * 100) / 100,
    };
  });

  return { days, daysTruncated: parseISO(first) < earliestShown };
}
