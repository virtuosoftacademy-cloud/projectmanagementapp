"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WEEKDAY_LABELS, formatDay, getWeekDays, shiftWeek } from "@/lib/domain";
import { formatDuration } from "@/lib/utils";

export type TimesheetRow = {
  memberId: string;
  name: string;
  /** Hours logged, keyed by ISO date. */
  byDate: Record<string, number>;
};

export function WeeklyTimesheet({
  rows,
  initialWeek,
}: {
  rows: TimesheetRow[];
  initialWeek: string;
}) {
  const [anchor, setAnchor] = useState(initialWeek);
  const days = getWeekDays(anchor);

  const dayTotal = (date: string) =>
    rows.reduce((sum, row) => sum + (row.byDate[date] ?? 0), 0);
  const rowTotal = (row: TimesheetRow) =>
    days.reduce((sum, date) => sum + (row.byDate[date] ?? 0), 0);

  const weekHours = days.reduce((sum, date) => sum + dayTotal(date), 0);
  const entryCount = rows.reduce(
    (sum, row) => sum + days.filter((date) => row.byDate[date]).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor((week) => shiftWeek(week, -1))}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[160px] text-center font-mono text-sm font-medium">
            {formatDay(days[0])} – {formatDay(days[6])}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor((week) => shiftWeek(week, 1))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="shadow-none">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Team Member</th>
                  {days.map((date, index) => (
                    <th key={date} className="px-3 py-2 text-center font-medium">
                      <div>{WEEKDAY_LABELS[index]}</div>
                      <div className="font-mono text-[11px] font-normal">{Number(date.slice(8))}</div>
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.memberId} className="border-b transition-colors hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className="flex items-center gap-2">
                        <UserAvatar
                          name={row.name}
                          className="h-6 w-6 bg-primary/10"
                          textClassName="text-[10px] text-primary"
                        />
                        {row.name}
                      </span>
                    </td>
                    {days.map((date) => (
                      <td key={date} className="px-3 py-2 text-center font-mono">
                        {row.byDate[date] ? formatDuration(row.byDate[date]) : "—"}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-2 text-right font-mono font-medium">
                      {formatDuration(rowTotal(row))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Summary label="Total Hours" value={formatDuration(weekHours)} />
        <Summary label="Team Members" value={rows.length.toString()} />
        <Summary label="Entries" value={entryCount.toString()} />
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
