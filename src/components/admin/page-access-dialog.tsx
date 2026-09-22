"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { setUserPagesAction } from "@/app/(app)/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import type { Role } from "@/lib/domain";
import { APP_PAGES, pagesForRole, roleLabel, type AppPage } from "@/lib/permissions";

/**
 * Which pages one member may reach.
 *
 * Only the pages their **role** already allows are listed — assignment narrows
 * access, it never widens it. Showing Billing to a viewer would promise
 * something the permission matrix and every server action would still refuse,
 * so the list is `pagesForRole` rather than the full catalogue.
 *
 * Everything ticked is the same as nothing assigned; the action stores null in
 * that case so the member keeps following their role as it changes.
 */
export function PageAccessDialog({
  open,
  onClose,
  userId,
  userName,
  role,
  assigned,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  role: Role;
  /** Stored assignment, or null when they have never been restricted. */
  assigned: string[] | null;
}) {
  const router = useRouter();
  const allowed = pagesForRole(role);

  const [selected, setSelected] = useState<string[]>(
    assigned === null ? allowed : allowed.filter((page) => assigned.includes(page)),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (page: AppPage) =>
    setSelected((current) =>
      current.includes(page)
        ? current.filter((item) => item !== page)
        : [...current, page],
    );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await setUserPagesAction(userId, selected);
      if (!result.ok) {
        setError(result.error ?? "Could not save that access.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const entries = APP_PAGES.filter((page) => allowed.includes(page.key));
  const unrestricted = selected.length === allowed.length;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={`Page access — ${userName}`}
      description={`Pages a ${roleLabel(role)} can reach. Unticking one hides it and blocks the URL.`}
      className="max-w-lg"
    >
      <form className="grid gap-4 py-2" onSubmit={submit}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{selected.length}</span> of{" "}
            <span className="font-mono">{allowed.length}</span> selected
            {unrestricted ? " — full access for their role" : null}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSelected(allowed)}
              disabled={pending}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSelected([])}
              disabled={pending}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
          {entries.map((page) => (
            <label
              key={page.key}
              className="flex cursor-pointer items-center gap-3 rounded-md p-1.5 hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.includes(page.key)}
                onCheckedChange={() => toggle(page.key)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{page.label}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {page.href}
                </span>
              </span>
            </label>
          ))}
        </div>

        {selected.length === 0 ? (
          <p className="text-xs text-warning">
            With nothing selected they can sign in but reach no pages.
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions
            onCancel={onClose}
            submitLabel={pending ? "Saving…" : "Save access"}
            disabled={pending}
          />
        </div>
      </form>
    </FormDialog>
  );
}
