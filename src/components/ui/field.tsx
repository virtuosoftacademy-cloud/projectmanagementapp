import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + optional hint.
 *
 * The control is nested inside the `<label>` so it is implicitly associated,
 * which keeps every form field labelled without threading ids around.
 */
export function Field({
  label,
  hint,
  required,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Label className={cn("block space-y-1.5 font-normal", className)}>
      <span className="text-sm font-medium leading-none">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-xs font-normal text-muted-foreground">{hint}</span> : null}
      {error ? (
        <span role="alert" className="block text-xs font-normal text-destructive">
          {error}
        </span>
      ) : null}
    </Label>
  );
}
