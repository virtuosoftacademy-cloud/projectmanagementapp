/**
 * The shape of an Excel sheet and the rules that keep it sane, shared by the
 * browser grid and the server actions — so both agree on the limits and on
 * what a stored sheet may contain.
 *
 * Nothing here touches the database; everything is a pure function of its
 * input, which is what lets the same checks run on both sides.
 */

import type { CellFormat, NumberFormat, SheetFormats } from "@/lib/domain";

/** Hard ceilings, enforced on read, on write and on import. */
export const SHEET_MAX_ROWS = 500;
export const SHEET_MAX_COLS = 52; // A…AZ
export const SHEET_MAX_PER_PROJECT = 20;
/** Longest text a single cell may hold. */
export const SHEET_MAX_CELL_LENGTH = 2000;

export const DEFAULT_COL_WIDTH = 120;
export const MIN_COL_WIDTH = 40;
export const MAX_COL_WIDTH = 600;

export const NUMBER_FORMATS: { value: NumberFormat; label: string }[] = [
  { value: "general", label: "General" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
  { value: "date", label: "Date" },
];

/** The key a cell's formatting is stored under. */
export const formatKey = (row: number, col: number) => `${row}:${col}`;

/**
 * Normalises stored cells to exactly `rows` × `cols` strings.
 *
 * Padded and trimmed rather than trusted, so a row saved short — or a grid
 * later resized — still renders as a rectangle, and anything that is not a
 * string (a corrupt row, a number from an old import) becomes one.
 */
export function normaliseCells(value: unknown, rows: number, cols: number): string[][] {
  const source = Array.isArray(value) ? value : [];

  return Array.from({ length: rows }, (_, r) => {
    const row = Array.isArray(source[r]) ? (source[r] as unknown[]) : [];
    return Array.from({ length: cols }, (_, c) => {
      const cell = row[c];
      if (typeof cell === "string") return cell.slice(0, SHEET_MAX_CELL_LENGTH);
      if (typeof cell === "number" || typeof cell === "boolean") return String(cell);
      return "";
    });
  });
}

const ALIGNMENTS = new Set(["left", "center", "right"]);
const FORMAT_VALUES = new Set(NUMBER_FORMATS.map((item) => item.value));

/**
 * Keeps only well-formed formatting for cells inside the grid.
 *
 * A stored sheet is read back from JSON and a saved one arrives from the
 * browser; neither is trusted. Unknown keys, out-of-range cells and nonsense
 * values are dropped rather than stored, and a cell whose formatting ends up
 * empty is left out entirely, so the column stays small.
 */
export function normaliseFormats(value: unknown, rows: number, cols: number): SheetFormats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const out: SheetFormats = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const match = /^(\d+):(\d+)$/.exec(key);
    if (!match) continue;
    const row = Number(match[1]);
    const col = Number(match[2]);
    if (row >= rows || col >= cols) continue;
    if (!raw || typeof raw !== "object") continue;

    const source = raw as Record<string, unknown>;
    const format: CellFormat = {};
    if (source.bold === true) format.bold = true;
    if (source.italic === true) format.italic = true;
    if (typeof source.align === "string" && ALIGNMENTS.has(source.align)) {
      format.align = source.align as CellFormat["align"];
    }
    if (typeof source.numberFormat === "string" && FORMAT_VALUES.has(source.numberFormat as NumberFormat)) {
      if (source.numberFormat !== "general") format.numberFormat = source.numberFormat as NumberFormat;
    }
    if (typeof source.decimals === "number" && Number.isInteger(source.decimals)) {
      format.decimals = Math.max(0, Math.min(10, source.decimals));
    }

    if (Object.keys(format).length) out[formatKey(row, col)] = format;
  }
  return out;
}

/** Column widths clamped to a usable range; one entry per column. */
export function normaliseWidths(value: unknown, cols: number): number[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: cols }, (_, c) => {
    const width = source[c];
    return typeof width === "number" && Number.isFinite(width)
      ? Math.round(Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, width)))
      : DEFAULT_COL_WIDTH;
  });
}

/**
 * Excel stores dates as days since 1899-12-30; a date cell holding 45000 is
 * 2023-03-15. Formulas like TODAY() and DATE() return these serials too.
 */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function serialToIsoDate(serial: number) {
  return new Date(EXCEL_EPOCH + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The text a cell shows, given its computed value and its format.
 *
 * Formatting never changes the stored value — `0.125` formatted as a percent
 * with one decimal shows "12.5%" but a formula reading it still gets 0.125,
 * exactly as in Excel.
 */
export function displayValue(
  value: number | string | boolean | null | { error: string },
  format: CellFormat | undefined,
): string {
  if (value === null) return "";
  if (typeof value === "object") return value.error;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return value;

  const decimals = format?.decimals;
  switch (format?.numberFormat) {
    case "number":
      return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      });
    case "currency":
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      });
    case "percent":
      return `${(value * 100).toFixed(decimals ?? 0)}%`;
    case "date":
      return serialToIsoDate(value);
    default: {
      if (decimals !== undefined) return value.toFixed(decimals);
      // Excel's "General" trims floating-point noise: 0.1+0.2 shows 0.3.
      return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
    }
  }
}
