import { Activity as ActivityIcon, ArrowUpRight, Zap } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActivityEntry } from "@/lib/domain";

export function ActivityTab({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>What&apos;s happening across the workspace</CardDescription>
          </div>
          <Button variant="ghost" size="xs">
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.map((entry) => {
          const actor = entry.actor;
          return (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-muted/50"
          >
            <UserAvatar
              name={actor.name}
              className="h-7 w-7"
              textClassName="text-[11px]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{actor.name}</span>{" "}
                <span className="text-muted-foreground">{entry.action}</span>{" "}
                <span className="font-medium">{entry.target}</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span className="font-mono">{entry.at}</span>
              </p>
            </div>
          </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
