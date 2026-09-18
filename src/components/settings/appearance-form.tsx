"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Monitor, Moon, Sun } from "lucide-react";
import { setThemeAction } from "@/app/(app)/settings/appearance/actions";
import { Card, CardContent } from "@/components/ui/card";
import { THEMES, type Theme } from "@/lib/domain";
import { cn } from "@/lib/utils";

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Theme picker, saved to the account.
 *
 * The class on `<html>` is rendered by the root layout from the database, so
 * the choice follows the person to any browser. This component keeps two things
 * in step with that:
 *
 *   1. It swaps the class immediately, so the page recolours on click rather
 *      than waiting for the round trip.
 *   2. `router.refresh()` afterwards lets the server re-render with the saved
 *      value, which is what makes the optimistic class stick — or revert, if
 *      the save failed.
 */
export function AppearanceForm({ current }: { current: Theme }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useOptimistic(current);

  function apply(theme: Theme) {
    if (theme === optimistic) return;
    setError(null);

    startTransition(async () => {
      setOptimistic(theme);

      // Paint it now. The root layout owns this class, but it cannot re-render
      // until the action resolves, and waiting reads as an unresponsive click.
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      if (theme !== "system") root.classList.add(theme);

      const result = await setThemeAction({ theme });
      if (!result.ok) {
        setError(result.error ?? "Could not save that theme.");
        // Put the class back; `useOptimistic` reverts its own half.
        root.classList.remove("light", "dark");
        if (current !== "system") root.classList.add(current);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((option) => {
          const selected = optimistic === option.value;
          const Icon = ICONS[option.value];

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={pending}
              onClick={() => apply(option.value)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-70",
                selected
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    selected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {selected ? <Check className="h-4 w-4 text-primary" /> : null}
              </span>
              <span className="mt-2 block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Card className="shadow-none">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Saved to your account, so it follows you to any browser or device.
          {optimistic === "system"
            ? " System follows whatever your operating system is set to."
            : null}
        </CardContent>
      </Card>
    </div>
  );
}
