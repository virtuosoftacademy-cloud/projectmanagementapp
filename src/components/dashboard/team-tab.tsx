import { Target } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Member } from "@/lib/domain";
import { formatPkr } from "@/lib/utils";

export type MemberRow = {
  member: Member;
  stats: { hours: number; tasksDone: number; tasksTotal: number; cost: number; utilization: number };
};

export function TeamTab({ rows }: { rows: MemberRow[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {rows.map(({ member, stats }) => {
        return (
          <Card key={member.id} className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{member.role}</p>
                </div>
                <Badge variant="secondary">Rs {member.hourlyRate}/h</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Tile value={`${stats.hours.toFixed(1)}h`} label="Logged" />
                <Tile value={`${stats.tasksDone}/${stats.tasksTotal}`} label="Tasks" />
                <Tile value={formatPkr(stats.cost)} label="Cost" />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Target className="h-3 w-3" />
                    Utilization
                  </span>
                  <span className="font-mono font-medium text-muted-foreground">{stats.utilization}%</span>
                </div>
                <Progress value={stats.utilization} aria-label={`${member.name} utilization`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <p className="font-mono text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
