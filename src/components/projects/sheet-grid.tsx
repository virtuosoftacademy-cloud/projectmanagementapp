"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CircleAlert,
  Download,
  Italic,
  Minus,
  Pin,
  Plus,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { saveSheetAction } from "@/app/(app)/projects/project/[id]/excel-sheet/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SelectField } from "@/components/ui/select-field";
import type { CellFormat, NumberFormat, SheetFormats } from "@/lib/domain";
import { columnName, evaluateSheet, isErrorValue, type CellValue } from "@/lib/sheet-formulas";
import { exportCsv, exportXlsx, slug } from "@/lib/sheet-io";
import {
  DEFAULT_COL_WIDTH,
  MAX_COL_WIDTH,
  MIN_COL_WIDTH,
  NUMBER_FORMATS,
  SHEET_MAX_CELL_LENGTH,
  SHEET_MAX_COLS,
  SHEET_MAX_ROWS,
  displayValue,
  formatKey,
  serialToIsoDate,
} from "@/lib/sheet-model";
import { cn } from "@/lib/utils";

type Point = { r: number; c: number };
type Snapshot = { cells: string[][]; formats: SheetFormats };

const HISTORY_LIMIT = 100;
const ROW_HEADER_WIDTH = 48;

/** Excel serial for an ISO day — the inverse of `serialToIsoDate`. */
function isoDateToSerial(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000);
}

const isFormula = (raw: string) => raw.length > 1 && raw.startsWith("=");

/**
 * An Excel-style sheet: formulas, formatting, keyboard navigation, range
 * selection, copy and paste, undo, resizable columns and a frozen header row.
 *
 * Cells hold exactly what was typed. A formula is stored as its text and
 * evaluated here on every change, so the grid shows results while the formula
 * bar shows the formula — and a saved sheet never contains a stale value.
 *
 * Edits stay local until saved. A sheet is edited in bursts, and saving every
 * keystroke would mean a write per character; instead there is one Save (or
 * Ctrl+S), an unsaved-changes marker, and a warning if the tab is closed with
 * work pending.
 *
 * Only one text input exists in the grid, on the cell being edited. Rendering
 * an input per cell — as the grid used to — is ten thousand inputs on a large
 * sheet, and it cannot show a formula's result while also keeping the formula.
 */
export function SheetGrid({
  sheetId,
  sheetName,
  projectName,
  initial,
  canEdit,
  updatedAt,
}: {
  sheetId: string;
  sheetName: string;
  projectName: string;
  initial: {
    cells: string[][];
    rowCount: number;
    colCount: number;
    formats: SheetFormats;
    colWidths: number[];
    frozenRows: number;
  };
  /** `projects.edit`. Without it the sheet is read-only. */
  canEdit: boolean;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  const [cells, setCells] = useState(initial.cells);
  const [formats, setFormats] = useState<SheetFormats>(initial.formats);
  const [colWidths, setColWidths] = useState<number[]>(() =>
    Array.from({ length: initial.colCount }, (_, c) => initial.colWidths[c] ?? DEFAULT_COL_WIDTH),
  );
  const [frozenRows, setFrozenRows] = useState(initial.frozenRows);
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;

  const [active, setActive] = useState<Point>({ r: 0, c: 0 });
  const [anchor, setAnchor] = useState<Point>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef(false);

  // Every formula, recomputed whenever the cells change — never while typing,
  // because the draft lives outside `cells` until it is committed.
  const values = useMemo(() => evaluateSheet(cells, sheetName), [cells, sheetName]);

  const range = useMemo(
    () => ({
      r1: Math.min(anchor.r, active.r),
      r2: Math.max(anchor.r, active.r),
      c1: Math.min(anchor.c, active.c),
      c2: Math.max(anchor.c, active.c),
    }),
    [anchor, active],
  );

  // Warn before closing the tab with unsaved work — the one way edits here can
  // be lost without anyone deciding to lose them.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** What the formula bar and the editor start from: the raw text, dates as dates. */
  const rawForEdit = useCallback(
    (r: number, c: number) => {
      const raw = cells[r]?.[c] ?? "";
      if (formats[formatKey(r, c)]?.numberFormat === "date" && /^-?\d+(\.\d+)?$/.test(raw)) {
        return serialToIsoDate(Number(raw));
      }
      return raw;
    },
    [cells, formats],
  );

  /** Records the current state for undo, then applies a change. */
  function change(next: Partial<Snapshot>) {
    setPast((history) => [...history.slice(-(HISTORY_LIMIT - 1)), { cells, formats }]);
    setFuture([]);
    if (next.cells) setCells(next.cells);
    if (next.formats) setFormats(next.formats);
    setDirty(true);
    setNotice(null);
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((history) => history.slice(0, -1));
    setFuture((history) => [{ cells, formats }, ...history]);
    setCells(previous.cells);
    setFormats(previous.formats);
    setDirty(true);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((history) => history.slice(1));
    setPast((history) => [...history, { cells, formats }]);
    setCells(next.cells);
    setFormats(next.formats);
    setDirty(true);
  }

  /**
   * Writes one cell. Typing a date (`2026-09-18`) stores it as an Excel date
   * serial with a date format — which is what Excel does, and what lets date
   * arithmetic in formulas work.
   */
  function writeCell(r: number, c: number, text: string) {
    let raw = text.slice(0, SHEET_MAX_CELL_LENGTH);
    let nextFormats = formats;

    if (!isFormula(raw) && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
      raw = String(isoDateToSerial(raw.trim()));
      nextFormats = {
        ...formats,
        [formatKey(r, c)]: { ...formats[formatKey(r, c)], numberFormat: "date" },
      };
    }

    if (cells[r][c] === raw && nextFormats === formats) return;
    const nextCells = cells.map((line, index) =>
      index === r ? line.map((cell, col) => (col === c ? raw : cell)) : line,
    );
    change({ cells: nextCells, formats: nextFormats });
  }

  function select(point: Point, extend = false) {
    const next = {
      r: Math.max(0, Math.min(rows - 1, point.r)),
      c: Math.max(0, Math.min(cols - 1, point.c)),
    };
    setActive(next);
    if (!extend) setAnchor(next);
  }

  function startEdit(initialText?: string) {
    if (!canEdit) return;
    setDraft(initialText ?? rawForEdit(active.r, active.c));
    setEditing(true);
  }

  function commit(move?: Point) {
    if (!editing) return;
    writeCell(active.r, active.c, draft);
    setEditing(false);
    if (move) select({ r: active.r + move.r, c: active.c + move.c });
    gridRef.current?.focus();
  }

  function cancel() {
    setEditing(false);
    gridRef.current?.focus();
  }

  function clearRange() {
    const nextCells = cells.map((line, r) =>
      r < range.r1 || r > range.r2
        ? line
        : line.map((cell, c) => (c >= range.c1 && c <= range.c2 ? "" : cell)),
    );
    change({ cells: nextCells });
  }

  /** Applies a formatting change to every cell in the selection. */
  function formatRange(patch: (current: CellFormat) => CellFormat) {
    const next = { ...formats };
    for (let r = range.r1; r <= range.r2; r += 1) {
      for (let c = range.c1; c <= range.c2; c += 1) {
        const key = formatKey(r, c);
        const updated = patch(next[key] ?? {});
        // Drop keys that went back to the default, so the stored map only
        // holds cells that are actually formatted.
        const trimmed = Object.fromEntries(
          Object.entries(updated).filter(
            ([k, v]) => v !== undefined && v !== false && !(k === "numberFormat" && v === "general"),
          ),
        ) as CellFormat;
        if (Object.keys(trimmed).length) next[key] = trimmed;
        else delete next[key];
      }
    }
    change({ formats: next });
  }

  /** On for all when any is off; off for all when all are on — Excel's rule. */
  function toggle(flag: "bold" | "italic") {
    let allOn = true;
    for (let r = range.r1; r <= range.r2 && allOn; r += 1) {
      for (let c = range.c1; c <= range.c2; c += 1) {
        if (!formats[formatKey(r, c)]?.[flag]) {
          allOn = false;
          break;
        }
      }
    }
    formatRange((current) => ({ ...current, [flag]: !allOn }));
  }

  function addRow() {
    if (rows >= SHEET_MAX_ROWS) return;
    change({ cells: [...cells, Array.from({ length: cols }, () => "")] });
  }

  function addColumn() {
    if (cols >= SHEET_MAX_COLS) return;
    change({ cells: cells.map((line) => [...line, ""]) });
    setColWidths((widths) => [...widths, DEFAULT_COL_WIDTH]);
  }

  function save() {
    if (!canEdit || !dirty) return;
    setError(null);
    startSaving(async () => {
      const result = await saveSheetAction({
        sheetId,
        rowCount: rows,
        colCount: cols,
        cells,
        formats,
        colWidths,
        frozenRows,
      });
      if (!result.ok) {
        // Kept dirty, so the work is not mistaken for saved.
        setError(result.error ?? "Could not save the sheet.");
        return;
      }
      setDirty(false);
      setNotice("Saved");
      router.refresh();
    });
  }

  // --- Clipboard ------------------------------------------------------------

  function copy(event: React.ClipboardEvent) {
    if (editing) return;
    event.preventDefault();
    // Displayed values, tab-separated — what Excel and every other
    // spreadsheet expect on the clipboard.
    const lines: string[] = [];
    for (let r = range.r1; r <= range.r2; r += 1) {
      const line: string[] = [];
      for (let c = range.c1; c <= range.c2; c += 1) {
        line.push(displayValue(values[r][c], formats[formatKey(r, c)]));
      }
      lines.push(line.join("\t"));
    }
    event.clipboardData.setData("text/plain", lines.join("\n"));
  }

  function paste(event: React.ClipboardEvent) {
    if (editing || !canEdit) return;
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;

    const block = text
      .replace(/\r\n?/g, "\n")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.split("\t"));
    const width = Math.max(...block.map((line) => line.length));
    const needRows = Math.min(SHEET_MAX_ROWS, Math.max(rows, active.r + block.length));
    const needCols = Math.min(SHEET_MAX_COLS, Math.max(cols, active.c + width));

    // Grow the grid to fit, within its limits — pasting a 30-row block into a
    // 20-row sheet should not silently lose the last ten rows.
    const next = cells.map((line) => [
      ...line,
      ...Array.from({ length: needCols - line.length }, () => ""),
    ]);
    while (next.length < needRows) next.push(Array.from({ length: needCols }, () => ""));

    block.forEach((line, dr) =>
      line.forEach((value, dc) => {
        const r = active.r + dr;
        const c = active.c + dc;
        if (r < needRows && c < needCols) next[r][c] = value.slice(0, SHEET_MAX_CELL_LENGTH);
      }),
    );

    if (needCols > cols) {
      setColWidths((widths) => [
        ...widths,
        ...Array.from({ length: needCols - widths.length }, () => DEFAULT_COL_WIDTH),
      ]);
    }
    change({ cells: next });
    setAnchor(active);
    setActive({
      r: Math.min(needRows - 1, active.r + block.length - 1),
      c: Math.min(needCols - 1, active.c + width - 1),
    });
  }

  // --- Keyboard -------------------------------------------------------------

  function onGridKeyDown(event: React.KeyboardEvent) {
    if (editing) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (mod && key === "s") {
      event.preventDefault();
      save();
      return;
    }
    if (mod && key === "z") {
      event.preventDefault();
      if (canEdit) (event.shiftKey ? redo : undo)();
      return;
    }
    if (mod && key === "y") {
      event.preventDefault();
      if (canEdit) redo();
      return;
    }
    if (mod && (key === "b" || key === "i")) {
      event.preventDefault();
      if (canEdit) toggle(key === "b" ? "bold" : "italic");
      return;
    }
    if (mod && key === "a") {
      event.preventDefault();
      setAnchor({ r: 0, c: 0 });
      setActive({ r: rows - 1, c: cols - 1 });
      return;
    }

    const moves: Record<string, Point> = {
      ArrowUp: { r: -1, c: 0 },
      ArrowDown: { r: 1, c: 0 },
      ArrowLeft: { r: 0, c: -1 },
      ArrowRight: { r: 0, c: 1 },
    };
    if (moves[event.key]) {
      event.preventDefault();
      const step = moves[event.key];
      select({ r: active.r + step.r, c: active.c + step.c }, event.shiftKey);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      select({ r: active.r, c: active.c + (event.shiftKey ? -1 : 1) });
      return;
    }
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      startEdit();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      if (canEdit) clearRange();
      return;
    }
    // Typing a character starts editing with that character, replacing the
    // cell — the way every spreadsheet behaves.
    if (event.key.length === 1 && !mod && !event.altKey) {
      event.preventDefault();
      startEdit(event.key);
    }
  }

  function onEditorKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit({ r: event.shiftKey ? -1 : 1, c: 0 });
    } else if (event.key === "Tab") {
      event.preventDefault();
      commit({ r: 0, c: event.shiftKey ? -1 : 1 });
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  // --- Mouse ----------------------------------------------------------------

  // A ref so the handlers passed to memoised rows keep a stable identity — a
  // new function every render would re-render every row on every keystroke.
  // Written in an effect, not during render, so rendering stays pure.
  const stateRef = useRef({ editing, commit, select, startEdit });
  useEffect(() => {
    stateRef.current = { editing, commit, select, startEdit };
  });

  const onCellMouseDown = useCallback((point: Point, extend: boolean) => {
    const current = stateRef.current;
    if (current.editing) current.commit();
    selectingRef.current = true;
    current.select(point, extend);
  }, []);

  const onCellMouseEnter = useCallback((point: Point) => {
    if (selectingRef.current) stateRef.current.select(point, true);
  }, []);

  // Double-click edits the cell with its own text, like F2 or Enter.
  const onCellDoubleClick = useCallback(() => stateRef.current.startEdit(), []);

  useEffect(() => {
    const stop = () => {
      selectingRef.current = false;
    };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  function startResize(col: number, event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = colWidths[col];
    const onMove = (move: MouseEvent) => {
      const width = Math.max(
        MIN_COL_WIDTH,
        Math.min(MAX_COL_WIDTH, startWidth + move.clientX - startX),
      );
      setColWidths((widths) => widths.map((w, i) => (i === col ? width : w)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDirty(true);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // --- Render ---------------------------------------------------------------

  const activeFormat = formats[formatKey(active.r, active.c)] ?? {};
  const activeRef = `${columnName(active.c)}${active.r + 1}`;
  const rangeLabel =
    range.r1 === range.r2 && range.c1 === range.c2
      ? activeRef
      : `${columnName(range.c1)}${range.r1 + 1}:${columnName(range.c2)}${range.r2 + 1}`;
  const totalWidth = ROW_HEADER_WIDTH + colWidths.reduce((sum, w) => sum + w, 0);

  // Per-row formatting, rebuilt only when formats change, so memoised rows see
  // a stable array while the draft is being typed.
  const formatRows = useMemo(
    () =>
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => formats[formatKey(r, c)]),
      ),
    [formats, rows, cols],
  );

  const exportable = { name: sheetName, cells, formats, colWidths, frozenRows };
  const filename = `${slug(projectName)}-${slug(sheetName)}`;

  return (
    <div className="space-y-2">
      {canEdit ? (
        <div
          role="toolbar"
          aria-label="Sheet formatting"
          className="flex flex-wrap items-center gap-1 rounded-md border bg-card p-1"
        >
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </Button>
          <Divider />
          <IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!past.length}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Redo (Ctrl+Y)" onClick={redo} disabled={!future.length}>
            <Redo2 className="h-4 w-4" />
          </IconButton>
          <Divider />
          <IconButton
            label="Bold (Ctrl+B)"
            pressed={!!activeFormat.bold}
            onClick={() => toggle("bold")}
          >
            <Bold className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Italic (Ctrl+I)"
            pressed={!!activeFormat.italic}
            onClick={() => toggle("italic")}
          >
            <Italic className="h-4 w-4" />
          </IconButton>
          <Divider />
          {(["left", "center", "right"] as const).map((align) => {
            const Icon =
              align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (
              <IconButton
                key={align}
                label={`Align ${align}`}
                pressed={activeFormat.align === align}
                onClick={() =>
                  formatRange((current) => ({
                    ...current,
                    align: current.align === align ? undefined : align,
                  }))
                }
              >
                <Icon className="h-4 w-4" />
              </IconButton>
            );
          })}
          <Divider />
          <SelectField
            value={activeFormat.numberFormat ?? "general"}
            aria-label="Number format"
            className="h-8 w-[8.5rem] text-xs"
            onValueChange={(value) =>
              formatRange((current) => ({ ...current, numberFormat: value as NumberFormat }))
            }
            options={NUMBER_FORMATS}
          />
          <IconButton
            label="Fewer decimal places"
            onClick={() =>
              formatRange((current) => ({
                ...current,
                decimals: Math.max(0, (current.decimals ?? 2) - 1),
              }))
            }
          >
            <Minus className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="More decimal places"
            onClick={() =>
              formatRange((current) => ({
                ...current,
                decimals: Math.min(10, (current.decimals ?? 0) + 1),
              }))
            }
          >
            <Plus className="h-4 w-4" />
          </IconButton>
          <Divider />
          <IconButton
            label={frozenRows ? "Unfreeze the header row" : "Freeze the header row"}
            pressed={frozenRows === 1}
            onClick={() => {
              setFrozenRows((value) => (value ? 0 : 1));
              setDirty(true);
            }}
          >
            <Pin className="h-4 w-4" />
          </IconButton>
          <Button variant="ghost" size="sm" onClick={addRow} disabled={rows >= SHEET_MAX_ROWS}>
            <Plus className="h-4 w-4" />
            Row
          </Button>
          <Button variant="ghost" size="sm" onClick={addColumn} disabled={cols >= SHEET_MAX_COLS}>
            <Plus className="h-4 w-4" />
            Column
          </Button>
          <div className="ml-auto">
            <ExportMenu exportable={exportable} filename={filename} onError={setError} />
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <ExportMenu exportable={exportable} filename={filename} onError={setError} />
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1">
        <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground" aria-live="polite">
          {rangeLabel}
        </span>
        <span aria-hidden className="font-serif text-sm italic text-muted-foreground">
          fx
        </span>
        <input
          aria-label={`Contents of ${activeRef}`}
          readOnly={!canEdit}
          value={editing ? draft : rawForEdit(active.r, active.c)}
          onFocus={() => {
            if (canEdit && !editing) {
              setDraft(rawForEdit(active.r, active.c));
              setEditing(true);
            }
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onEditorKeyDown}
          className="h-7 min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
        />
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

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={`${sheetName}. Arrow keys move, Enter edits, Ctrl+S saves.`}
        aria-rowcount={rows}
        aria-colcount={cols}
        onKeyDown={onGridKeyDown}
        onCopy={copy}
        onPaste={paste}
        className="max-h-[70vh] overflow-auto rounded-md border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table
          className="border-separate border-spacing-0 text-sm"
          style={{ tableLayout: "fixed", width: totalWidth }}
        >
          <colgroup>
            <col style={{ width: ROW_HEADER_WIDTH }} />
            {colWidths.map((width, c) => (
              <col key={c} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 h-7 border-b border-r bg-muted" />
              {colWidths.map((_, c) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-20 h-7 select-none border-b border-r bg-muted text-xs font-medium text-muted-foreground",
                    c >= range.c1 && c <= range.c2 && "bg-primary/15 text-foreground",
                  )}
                >
                  <span className="relative block">
                    {columnName(c)}
                    {canEdit ? (
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize column ${columnName(c)}`}
                        onMouseDown={(event) => startResize(c, event)}
                        className="absolute -right-1.5 -top-1.5 h-7 w-2 cursor-col-resize hover:bg-primary/40"
                      />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((line, r) => (
              <SheetRow
                key={r}
                r={r}
                cells={line}
                values={values[r]}
                formats={formatRows[r]}
                frozen={frozenRows === 1 && r === 0}
                inRange={r >= range.r1 && r <= range.r2}
                rangeC1={range.c1}
                rangeC2={range.c2}
                activeCol={active.r === r ? active.c : -1}
                editing={editing && active.r === r}
                draft={editing && active.r === r ? draft : ""}
                onDraft={setDraft}
                onEditorKeyDown={onEditorKeyDown}
                onEditorBlur={() => commit()}
                onCellMouseDown={onCellMouseDown}
                onCellMouseEnter={onCellMouseEnter}
                onCellDoubleClick={onCellDoubleClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
        {dirty ? (
          <span className="text-warning">Unsaved changes</span>
        ) : notice ? (
          <span>{notice}</span>
        ) : updatedAt ? (
          <span>Last saved {new Date(updatedAt).toLocaleString()}</span>
        ) : (
          <span>Not saved yet</span>
        )}
        <span className="font-mono">
          {rows}×{cols}
        </span>
        {!canEdit ? <span>You can read and export this sheet, but not change it.</span> : null}
      </p>
    </div>
  );
}

// --- Row ---------------------------------------------------------------------

/**
 * One row of the grid.
 *
 * Memoised: typing into the editor changes only the active row's `draft`, so
 * every other row skips rendering. Without this a 500-row sheet would re-render
 * twenty-six thousand cells per keystroke.
 */
const SheetRow = memo(function SheetRow({
  r,
  cells,
  values,
  formats,
  frozen,
  inRange,
  rangeC1,
  rangeC2,
  activeCol,
  editing,
  draft,
  onDraft,
  onEditorKeyDown,
  onEditorBlur,
  onCellMouseDown,
  onCellMouseEnter,
  onCellDoubleClick,
}: {
  r: number;
  cells: string[];
  values: CellValue[];
  formats: (CellFormat | undefined)[];
  frozen: boolean;
  inRange: boolean;
  rangeC1: number;
  rangeC2: number;
  activeCol: number;
  editing: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onEditorKeyDown: (event: React.KeyboardEvent) => void;
  onEditorBlur: () => void;
  onCellMouseDown: (point: Point, extend: boolean) => void;
  onCellMouseEnter: (point: Point) => void;
  onCellDoubleClick: () => void;
}) {
  return (
    <tr aria-rowindex={r + 1}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-10 h-7 select-none border-b border-r bg-muted text-center font-mono text-xs font-normal text-muted-foreground",
          frozen && "top-7 z-20",
          inRange && "bg-primary/15 text-foreground",
        )}
      >
        {r + 1}
      </th>
      {cells.map((raw, c) => {
        const value = values[c];
        const format = formats[c];
        const isActive = activeCol === c;
        const selected = inRange && c >= rangeC1 && c <= rangeC2;
        const align =
          format?.align ??
          (typeof value === "number" ? "right" : typeof value === "boolean" ? "center" : "left");

        return (
          <td
            key={c}
            role="gridcell"
            aria-selected={selected}
            title={isFormula(raw) ? raw : undefined}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              onCellMouseDown({ r, c }, event.shiftKey);
            }}
            onMouseEnter={() => onCellMouseEnter({ r, c })}
            onDoubleClick={onCellDoubleClick}
            className={cn(
              "relative h-7 overflow-hidden border-b border-r px-1.5",
              frozen && "sticky top-7 z-10 bg-card",
              selected && !isActive && "bg-primary/10",
              isActive && "outline outline-2 -outline-offset-2 outline-primary",
            )}
          >
            {isActive && editing ? (
              <input
                autoFocus
                aria-label={`Edit ${columnName(c)}${r + 1}`}
                value={draft}
                onChange={(event) => onDraft(event.target.value)}
                onKeyDown={onEditorKeyDown}
                onBlur={onEditorBlur}
                className="absolute inset-0 z-20 h-full w-full bg-card px-1.5 font-mono text-sm shadow-md outline outline-2 outline-primary"
              />
            ) : (
              <div
                className={cn(
                  "truncate leading-7",
                  align === "right" && "text-right",
                  align === "center" && "text-center",
                  format?.bold && "font-semibold",
                  format?.italic && "italic",
                  isErrorValue(value) && "font-mono text-xs text-destructive",
                )}
              >
                {displayValue(value, format)}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
});

// --- Toolbar pieces ------------------------------------------------------------

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />;
}

function IconButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keeps focus — and the selection — on the grid while clicking tools.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn("h-8 w-8", pressed && "bg-primary/15 text-foreground")}
    >
      {children}
    </Button>
  );
}

function ExportMenu({
  exportable,
  filename,
  onError,
}: {
  exportable: Parameters<typeof exportCsv>[0];
  filename: string;
  onError: (message: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() =>
            exportXlsx(exportable, `${filename}.xlsx`).catch(() =>
              onError("Could not build the Excel file."),
            )
          }
        >
          Excel workbook (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportCsv(exportable, `${filename}.csv`)}>
          CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
