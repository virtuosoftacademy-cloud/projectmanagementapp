"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Download, Plus, Save } from "lucide-react";
import { saveSheetAction } from "@/app/(app)/projects/project/[id]/spreadsheet/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Matches the ceilings the server enforces. */
const MAX_ROWS = 200;
const MAX_COLS = 26;

/** 0 → A, 25 → Z. Only ever called for indexes below MAX_COLS. */
function columnName(index: number) {
  return String.fromCharCode(65 + index);
}

/** Lower-cased, hyphenated — safe in a filename on every platform. */
function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sheet";
}

/** RFC 4180 quoting — commas, quotes and newlines all have to survive Excel. */
function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * One free-form spreadsheet. A project may hold several; `SheetWorkspace`
 * decides which is open and mounts this for it.
 *
 * Deliberately unrelated to tasks: it is a blank grid people type into, and
 * nothing in it is derived from or written back to anything else in the app.
 *
 * Edits are local until saved. Autosaving each keystroke would mean a write per
 * character, and a spreadsheet is edited in bursts — so there is one explicit
 * Save, and an unsaved-changes marker so it is obvious when work is pending.
 */
export function SheetGrid({
  sheetId,
  sheetName,
  projectName,
  initialCells,
  initialRows,
  initialCols,
  canEdit,
  updatedAt,
}: {
  sheetId: string;
  sheetName: string;
  projectName: string;
  initialCells: string[][];
  initialRows: number;
  initialCols: number;
  /** `projects.edit`. Without it the grid is read-only. */
  canEdit: boolean;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cells, setCells] = useState(initialCells);
  const [rows, setRows] = useState(initialRows);
  const [cols, setCols] = useState(initialCols);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setCell(row: number, col: number, value: string) {
    setCells((current) =>
      current.map((line, r) =>
        r === row ? line.map((cell, c) => (c === col ? value : cell)) : line,
      ),
    );
    setDirty(true);
    setSaved(false);
  }

  function addRow() {
    if (rows >= MAX_ROWS) return;
    setCells((current) => [...current, Array.from({ length: cols }, () => "")]);
    setRows((current) => current + 1);
    setDirty(true);
  }

  function addColumn() {
    if (cols >= MAX_COLS) return;
    setCells((current) => current.map((line) => [...line, ""]));
    setCols((current) => current + 1);
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveSheetAction({
        sheetId,
        rowCount: rows,
        colCount: cols,
        cells,
      });

      if (!result.ok) {
        setError(result.error ?? "Could not save the sheet.");
        return;
      }

      setDirty(false);
      setSaved(true);
      router.refresh();
    });
  }

  function exportCsv() {
    // Trailing blank rows and columns are an artefact of the grid's shape, not
    // content, so they are trimmed rather than exported as empty lines.
    const lastRow = cells.reduce((last, line, r) => (line.some(Boolean) ? r : last), -1);
    const lastCol = cells.reduce(
      (last, line) =>
        line.reduce((inner, cell, c) => (cell ? Math.max(inner, c) : inner), last),
      -1,
    );

    if (lastRow < 0) return;

    const csv =
      "﻿" +
      cells
        .slice(0, lastRow + 1)
        .map((line) => line.slice(0, lastCol + 1).map(csvCell).join(","))
        .join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(projectName)}-${slug(sheetName)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <>
            <Button size="sm" onClick={save} disabled={pending || !dirty}>
              <Save className="h-4 w-4" />
              {pending ? "Saving…" : dirty ? "Save" : "Saved"}
            </Button>
            <Button variant="outline" size="sm" onClick={addRow} disabled={rows >= MAX_ROWS}>
              <Plus className="h-4 w-4" />
              Row
            </Button>
            <Button variant="outline" size="sm" onClick={addColumn} disabled={cols >= MAX_COLS}>
              <Plus className="h-4 w-4" />
              Column
            </Button>
          </>
        ) : null}

        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>

        <p className="ml-auto text-xs text-muted-foreground">
          {dirty ? (
            <span className="text-warning">Unsaved changes</span>
          ) : saved ? (
            "Saved"
          ) : updatedAt ? (
            `Last saved ${new Date(updatedAt).toLocaleString()}`
          ) : (
            "Not saved yet"
          )}
          {" · "}
          <span className="font-mono">
            {rows}×{cols}
          </span>
        </p>
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
        <CardContent className="p-0">
          <div className="w-full overflow-auto">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  {/* Corner cell above the row numbers. */}
                  <th className="sticky left-0 z-10 w-12 border-b border-r bg-muted/50 p-0" />
                  {Array.from({ length: cols }, (_, c) => (
                    <th
                      key={c}
                      className="min-w-[9rem] border-b border-r bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {columnName(c)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({ length: rows }, (_, r) => (
                  <tr key={r}>
                    <td className="sticky left-0 z-10 border-b border-r bg-muted/50 px-2 py-1 text-center font-mono text-xs text-muted-foreground">
                      {r + 1}
                    </td>
                    {Array.from({ length: cols }, (_, c) => (
                      <td key={c} className="border-b border-r p-0">
                        <input
                          value={cells[r]?.[c] ?? ""}
                          readOnly={!canEdit}
                          aria-label={`${columnName(c)}${r + 1}`}
                          onChange={(event) => setCell(r, c, event.target.value)}
                          className={cn(
                            "h-8 w-full min-w-[9rem] bg-transparent px-2 text-sm outline-none",
                            "focus:bg-primary/5 focus:ring-1 focus:ring-inset focus:ring-primary/40",
                            !canEdit && "cursor-default",
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {!canEdit ? (
        <p className="text-xs text-muted-foreground">
          You can read and export this sheet, but not change it.
        </p>
      ) : null}
    </div>
  );
}
