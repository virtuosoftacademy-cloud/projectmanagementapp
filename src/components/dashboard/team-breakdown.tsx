import { FolderKanban, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type TeamBreakdownRow = {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  projectCount: number;
  tasksDone: number;
  tasksTotal: number;
  hours: number;
  /** True for the synthetic bucket holding people and projects with no team. */
  unassigned: boolean;
};

/**
 * Per-team roll-up above the member cards on the dashboard's Team tab.
 *
 * Answers "how is each team doing?" where the cards below answer "how is each
 * person doing?". Every figure is summed from the same project and member data
 * the rest of the dashboard already loaded, so the two views cannot disagree.
 *
 * Rows are computed on the server and arrive as plain data — no dates, no
 * functions — because this renders inside a client tab panel.
 */
export function TeamBreakdown({ rows }: { rows: TeamBreakdownRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">By team</h2>
        <p className="text-xs text-muted-foreground">
          {rows.filter((row) => !row.unassigned).length} teams
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const progress = row.tasksTotal
            ? Math.round((row.tasksDone / row.tasksTotal) * 100)
            : 0;

          return (
            <Card key={row.id} className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {row.unassigned ? null : (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                    )}
                    <h3
                      className={
                        row.unassigned
                          ? "truncate text-sm font-medium text-muted-foreground"
                          : "truncate text-sm font-medium"
                      }
                    >
                      {row.name}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {row.memberCount}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <FolderKanban className="h-3 w-3" />
                      {row.projectCount}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="font-mono font-medium">
                      {row.tasksDone}/{row.tasksTotal} • {progress}%
                    </span>
                  </div>
                  <Progress value={progress} aria-label={`${row.name} task progress`} />
                </div>

                <div className="grid gap-2 border-t pt-2 text-center">
                  <Tile value={`${row.hours.toFixed(1)}h`} label="Logged" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-sm font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
