/**
 * Formula evaluation for the Excel sheet.
 *
 * Cells are stored exactly as typed: a formula is kept as its text ("=SUM(A1:A3)")
 * and a value as its text ("42"). Evaluation happens here, in the browser, on
 * every edit — the stored grid never contains computed results, so a sheet can
 * never hold a value that disagrees with its own formula.
 *
 * Parsing is fast-formula-parser (MIT, ~280 Excel functions). This module owns
 * the part the library leaves to its caller: resolving references to *other*
 * cells, which may themselves be formulas, while detecting cycles.
 */

import FormulaParser, { type CellRef, type RangeRef } from "fast-formula-parser";
import { EXTRA_FUNCTIONS } from "@/lib/sheet-functions";

const { FormulaError, DepParser } = FormulaParser;

type DepRef = CellRef | RangeRef;

/** What a cell evaluates to. `null` is an empty cell, as Excel means it. */
export type CellValue = number | string | boolean | null | { error: string };

export function isErrorValue(value: CellValue): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value;
}

/** Shown in a cell whose formula depends, directly or not, on itself. */
export const CYCLE_ERROR = "#CYCLE!";

/** Thrown internally to unwind out of a cycle; never escapes `evaluateSheet`. */
class CycleSignal extends Error {}

/**
 * Turns whatever the parser threw into the error text a cell shows.
 *
 * The parser wraps anything a callback throws in a generic `#ERROR!` and keeps
 * the original in `details` — so a cycle, detected inside `onCell`, arrives
 * disguised and has to be unwrapped here. It also reports an unknown function
 * as `#ERROR!` with a "not implemented" message, where Excel says `#NAME?`.
 */
function describe(error: unknown): string {
  if (error instanceof CycleSignal) return CYCLE_ERROR;
  if (error instanceof FormulaError) {
    const details = (error as InstanceType<typeof FormulaError> & { details?: unknown }).details;
    if (details instanceof CycleSignal) return CYCLE_ERROR;
    if (details instanceof FormulaError) return details.error;
    if (/is not implemented/i.test(error.message)) return "#NAME?";
    return error.error;
  }
  // A syntax error: Excel would refuse the formula outright. A stored cell can
  // only show that it cannot be computed.
  return "#ERROR!";
}

/**
 * A plain cell's text as the value a formula would see.
 *
 * Numeric text becomes a number, so `=A1+A2` works on typed figures, and
 * TRUE/FALSE become booleans, matching Excel. Anything else stays text.
 * Thousands separators and currency symbols are deliberately *not* stripped:
 * "1,200" might be a list, and guessing wrong silently corrupts arithmetic.
 */
export function literalValue(raw: string): CellValue {
  const text = raw.trim();
  if (text === "") return null;
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return Number(text);
  const upper = text.toUpperCase();
  if (upper === "TRUE") return true;
  if (upper === "FALSE") return false;
  return raw;
}

/** Collapses the parser's return value into a `CellValue`. */
function normalise(result: unknown): CellValue {
  if (result instanceof FormulaError) return { error: result.error };
  // An array formula spills in Excel; a single cell shows its first value.
  if (Array.isArray(result)) return normalise(Array.isArray(result[0]) ? result[0][0] : result[0]);
  if (result === undefined) return null;
  if (typeof result === "number" && !Number.isFinite(result)) return { error: "#NUM!" };
  return result as CellValue;
}

/**
 * Evaluates every cell in a sheet.
 *
 * Each formula is computed at most once (memoised), and a cell reached again
 * while it is still being computed marks a cycle. Every cell on that cycle
 * shows `#CYCLE!` rather than hanging the tab or reporting a stale number.
 *
 * References to another sheet (`Sheet2!A1`) resolve to `#REF!`: only the open
 * sheet's cells are loaded, and returning an empty value there would make a
 * formula look correct while computing the wrong answer.
 */
export function evaluateSheet(cells: string[][], sheetName = "Sheet1"): CellValue[][] {
  const rows = cells.length;
  const cols = rows ? cells[0].length : 0;

  const memo = new Map<number, CellValue>();
  const visiting = new Set<number>();
  const key = (r: number, c: number) => r * 100_000 + c;

  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols;
  const isFormula = (raw: string | undefined) => !!raw && raw.length > 1 && raw.startsWith("=");

  const foreign = (sheet: string | undefined) =>
    sheet !== undefined && sheet !== "" && sheet.toLowerCase() !== sheetName.toLowerCase();

  const depParser = new DepParser();

  const parser = new FormulaParser({
    functions: EXTRA_FUNCTIONS,
    onCell: ({ sheet, row, col }: { sheet?: string; row: number; col: number }) => {
      if (foreign(sheet)) return FormulaError.REF;
      return valueAt(row - 1, col - 1);
    },
    onRange: (ref: {
      sheet?: string;
      from: { row: number; col: number };
      to: { row: number; col: number };
    }) => {
      if (foreign(ref.sheet)) return FormulaError.REF;
      const lastRow = Math.min(ref.to.row, rows);
      const lastCol = Math.min(ref.to.col, cols);
      const out: unknown[][] = [];
      for (let r = ref.from.row; r <= lastRow; r += 1) {
        const line: unknown[] = [];
        for (let c = ref.from.col; c <= lastCol; c += 1) line.push(valueAt(r - 1, c - 1));
        out.push(line);
      }
      return out;
    },
  });

  /**
   * The value a reference to (r, c) sees, while a formula is being parsed.
   *
   * This only ever *reads*. Every formula a cell depends on has already been
   * evaluated by `prepare` before its parse began — the parser is not
   * reentrant, and parsing a second formula from inside this callback corrupts
   * the first one's state. (That is not documented; it shows up as `#ERROR!`
   * on any formula whose range contains another, unevaluated formula.)
   */
  function valueAt(r: number, c: number): unknown {
    if (!inBounds(r, c)) return null;
    const cached = memo.get(key(r, c));
    const value = cached !== undefined ? cached : literalValue(cells[r][c] ?? "");
    if (cached === undefined && isFormula(cells[r][c])) {
      // Unreachable while the dependency walk is complete: every static
      // reference was resolved up front. Failing loudly beats guessing.
      return new FormulaError("#REF!");
    }
    if (isErrorValue(value)) return new FormulaError(value.error);
    return value;
  }

  /**
   * Evaluates every formula this one references, before it is parsed.
   *
   * Returns the error to show instead, if one of them is on a cycle — a
   * cell that depends on a cycle cannot have a meaningful value either.
   */
  function prepare(formula: string, r: number, c: number): string | null {
    let refs: DepRef[];
    try {
      refs = depParser.parse(formula, { sheet: sheetName, row: r + 1, col: c + 1 });
    } catch {
      // Unparseable; the real parse below reports the error properly.
      return null;
    }

    for (const ref of refs) {
      if (foreign(ref.sheet)) continue;
      const from = "from" in ref ? ref.from : ref;
      const to = "to" in ref ? ref.to : ref;
      // Whole-column and whole-row references (A:A, 1:1) arrive with the far
      // end at Excel's maximum; clamping to the real grid keeps SUM(A:A) from
      // walking a million empty rows.
      const lastRow = Math.min(to.row, rows);
      const lastCol = Math.min(to.col, cols);
      for (let dr = from.row - 1; dr < lastRow; dr += 1) {
        for (let dc = from.col - 1; dc < lastCol; dc += 1) {
          if (!inBounds(dr, dc) || !isFormula(cells[dr][dc])) continue;
          const value = evaluateCell(dr, dc);
          if (isErrorValue(value) && value.error === CYCLE_ERROR) return CYCLE_ERROR;
        }
      }
    }
    return null;
  }

  function evaluateCell(r: number, c: number): CellValue {
    const id = key(r, c);
    const cached = memo.get(id);
    if (cached !== undefined) return cached;

    const raw = cells[r]?.[c] ?? "";
    if (!isFormula(raw)) {
      const literal = literalValue(raw);
      memo.set(id, literal);
      return literal;
    }

    // Reached again while still resolving its own dependencies: a cycle.
    if (visiting.has(id)) throw new CycleSignal();
    visiting.add(id);

    const formula = raw.slice(1);
    let result: CellValue;
    try {
      const blocked = prepare(formula, r, c);
      result = blocked
        ? { error: blocked }
        : normalise(parser.parse(formula, { sheet: sheetName, row: r + 1, col: c + 1 }));
    } catch (error) {
      result = { error: describe(error) };
    } finally {
      visiting.delete(id);
    }

    memo.set(id, result);
    return result;
  }

  return cells.map((line, r) => line.map((_, c) => evaluateCell(r, c)));
}

/** 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}
