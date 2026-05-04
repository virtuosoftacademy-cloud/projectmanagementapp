import { cn } from "@/lib/utils";
import { formatMinutes } from "@/hooks/useTimer";

interface VarianceBadgeProps {
  estimatedMinutes: number;
  actualMinutes: number;
  className?: string;
  showLabel?: boolean;
}

export function VarianceBadge({ estimatedMinutes, actualMinutes, className, showLabel = true }: VarianceBadgeProps) {
  const variance = actualMinutes - estimatedMinutes;
  const percent = estimatedMinutes > 0 ? Math.round((variance / estimatedMinutes) * 100) : 0;

  const isOver = variance > 0;
  const isUnder = variance < 0;
  const isOnTrack = variance === 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        isOver && "bg-destructive/10 text-destructive",
        isUnder && "bg-success/10 text-success",
        isOnTrack && "bg-muted text-muted-foreground",
        className
      )}
    >
      {isOver && "+"}
      {formatMinutes(Math.abs(variance))}
      {showLabel && (
        <span className="text-[10px] opacity-70">
          ({isOver ? "over" : isUnder ? "under" : "on track"})
        </span>
      )}
    </span>
  );
}

export function getVarianceColor(estimatedMinutes: number, actualMinutes: number): string {
  const variance = actualMinutes - estimatedMinutes;
  if (variance > 0) return "hsl(var(--destructive))";
  if (variance < 0) return "hsl(var(--success))";
  return "hsl(var(--muted-foreground))";
}
