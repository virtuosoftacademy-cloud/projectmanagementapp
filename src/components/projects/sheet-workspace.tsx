"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Plus, Trash2, Upload, UserRound } from "lucide-react";
import {
  assignSheetAction,
  createSheetAction,
  deleteSheetAction,
  importSheetsAction,
  renameSheetAction,
} from "@/app/(app)/projects/project/[id]/excel-sheet/actions";
import { SheetGrid } from "@/components/projects/sheet-grid";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Field } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { Member, SheetDetail, SheetSummary } from "@/lib/domain";
import { readCsv, readWorkbook } from "@/lib/sheet-io";
import { cn } from "@/lib/utils";

/** Radix rejects an empty option value, so "nobody" travels as a sentinel. */
const UNASSIGNED = "none";

/**
 * The sheets of one project: a tab strip, the open sheet, and who owns it.
 *
 * Which sheet is open lives in the URL rather than in state, so only the open
 * sheet's cells are ever fetched — loading every grid to render a tab strip
 * would grow with the number of sheets for no benefit — and so a link to a
 * particular sheet works.
 */
export function SheetWorkspace({
  projectId,
  projectName,
  sheets,
  active,
  members,
  canEdit,
}: {
  projectId: string;
  projectName: string;
  sheets: SheetSummary[];
  /** The open sheet, or null when the project has none yet. */
  active: SheetDetail | null;
  members: Member[];
  /** `projects.edit`. Without it sheets are read-only. */
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Adds a sheet per worksheet in an .xlsx, or one sheet for a .csv.
   *
   * The file is parsed here in the browser and only its contents are sent, so
   * no binary format reaches a server action. Anything cut to fit the grid's
   * limits is reported rather than dropped silently.
   */
  function importFile(file: File) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      let report;
      try {
        report = /\.csv$/i.test(file.name) ? await readCsv(file) : await readWorkbook(file);
      } catch {
        setError(`${file.name} could not be read as an Excel or CSV file.`);
        return;
      }

      const result = await importSheetsAction({ projectId, sheets: report.sheets });
      if (!result.ok) {
        setError(result.error ?? "That import did not work.");
        return;
      }

      const count = report.sheets.length;
      setNotice(
        `Imported ${count} sheet${count === 1 ? "" : "s"} from ${file.name}.` +
          (report.truncated.length
            ? ` Some were larger than a sheet can hold and were cut: ${report.truncated.join("; ")}.`
            : ""),
      );
      if (result.sheetId) open(result.sheetId);
    });
  }

  function open(sheetId: string) {
    router.push(`/projects/project/${projectId}/excel-sheet?sheet=${sheetId}`);
  }

  function run(action: () => Promise<{ ok: boolean; error?: string; sheetId?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "That did not work.");
        return;
      }

      setCreating(false);
      setRenaming(false);
      setRemoving(false);

      // A new sheet becomes the open one; a deleted one hands over to whichever
      // sheet remains, so the page is never left pointing at nothing.
      if (result.sheetId) open(result.sheetId);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 border-b pb-2">
        {sheets.map((sheet) => (
          <button
            key={sheet.id}
            type="button"
            onClick={() => open(sheet.id)}
            className={cn(
              "flex items-center gap-2 rounded-t-md border-b-2 px-3 py-1.5 text-sm transition-colors",
              sheet.id === active?.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {sheet.name}
            {sheet.assignee ? (
              <UserAvatar
                name={sheet.assignee.name}
                className="h-5 w-5"
                textClassName="text-[9px]"
              />
            ) : null}
          </button>
        ))}

        {canEdit ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => {
                setDraftName(`Sheet ${sheets.length + 1}`);
                setError(null);
                setCreating(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New sheet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {pending ? "Importing…" : "Import"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Reset, so importing the same file twice in a row still fires.
                event.target.value = "";
                if (file) importFile(file);
              }}
            />
          </>
        ) : null}
      </div>

      {notice ? (
        <p role="status" className="rounded-md border bg-muted/40 p-3 text-sm">
          {notice}
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

      {!active ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {canEdit
            ? "No sheets yet. Create one to start."
            : "This project has no sheets yet."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold">{active.name}</h2>

            <span className="flex items-center gap-2">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              {canEdit ? (
                <SelectField
                  value={active.assignee?.id ?? UNASSIGNED}
                  disabled={pending}
                  aria-label={`Assign ${active.name}`}
                  className="h-8 w-[200px] text-xs"
                  onValueChange={(value) =>
                    run(() =>
                      assignSheetAction({
                        sheetId: active.id,
                        assigneeId: value === UNASSIGNED ? null : value,
                      }),
                    )
                  }
                  options={[
                    { value: UNASSIGNED, label: "Unassigned" },
                    ...members.map((member) => ({ value: member.id, label: member.name })),
                  ]}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {active.assignee?.name ?? "Unassigned"}
                </span>
              )}
            </span>

            {canEdit ? (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setDraftName(active.name);
                    setError(null);
                    setRenaming(true);
                  }}
                >
                  Rename
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setRemoving(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>

          <SheetGrid
            // Remounts on switching sheets, so the grid's own unsaved state
            // never carries from one sheet into another.
            key={active.id}
            sheetId={active.id}
            sheetName={active.name}
            projectName={projectName}
            initial={{
              cells: active.cells,
              rowCount: active.rowCount,
              colCount: active.colCount,
              formats: active.formats,
              colWidths: active.colWidths,
              frozenRows: active.frozenRows,
            }}
            canEdit={canEdit}
            updatedAt={active.updatedAt}
          />
        </>
      )}

      <FormDialog
        key={`create-${creating}`}
        open={creating}
        onClose={() => setCreating(false)}
        title="New sheet"
        description="A blank grid. You can rename or assign it afterwards."
      >
        <form
          className="grid gap-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => createSheetAction({ projectId, name: draftName }));
          }}
        >
          <Field label="Name" required>
            <Input
              required
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogActions
              onCancel={() => setCreating(false)}
              submitLabel={pending ? "Creating…" : "Create sheet"}
              disabled={pending}
            />
          </div>
        </form>
      </FormDialog>

      <FormDialog
        key={`rename-${renaming}`}
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename sheet"
        description=""
      >
        <form
          className="grid gap-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (active) run(() => renameSheetAction({ sheetId: active.id, name: draftName }));
          }}
        >
          <Field label="Name" required>
            <Input
              required
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogActions
              onCancel={() => setRenaming(false)}
              submitLabel={pending ? "Saving…" : "Save name"}
              disabled={pending}
            />
          </div>
        </form>
      </FormDialog>

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={() => {
          if (active) run(() => deleteSheetAction(active.id));
        }}
        title={`Delete ${active?.name ?? "sheet"}?`}
        description="Everything typed into this sheet goes with it. This cannot be undone."
      />
    </div>
  );
}
