import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tones = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
} as const;

export function KpiCard({
  icon: Icon,
  tone = "primary",
  value,
  label,
  hint,
  delta,
}: {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  value: string;
  label: string;
  hint: string;
  delta?: number;
}) {
  const TrendIcon = delta !== undefined && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              tones[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          {delta !== undefined ? (
            <span
              className={cn(
                "flex items-center gap-0.5 font-mono text-[10px] font-medium",
                delta < 0 ? "text-destructive" : "text-success",
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          ) : null}
        </div>
        <p className="mt-3 truncate font-mono text-xl font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground/80">{hint}</p>
      </CardContent>
    </Card>
  );
}
