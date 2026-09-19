/**
 * Excel functions fast-formula-parser does not implement.
 *
 * The library covers ~280 functions but, surprisingly, not MIN, MAX, COUNTA,
 * SUMIFS or MATCH — the ones people reach for first. A sheet without them
 * would feel broken rather than limited, so they are filled in here.
 *
 * Every function receives the library's wrapped arguments: `{ value, isArray,
 * isRangeRef, isCellRef }`, where a range's `value` is a 2-D array. Errors met
 * in any referenced cell propagate, as they do in Excel — `=MAX(A1:A3)` over a
 * `#DIV/0!` is `#DIV/0!`, not the largest of the remaining numbers.
 */

import FormulaParser from "fast-formula-parser";

const { FormulaError } = FormulaParser;

type Param = { value: unknown; isArray?: boolean; isRangeRef?: boolean; isCellRef?: boolean };

/** A flattened argument value, remembering whether it was typed literally. */
type Item = { value: unknown; literal: boolean };

function flatten(params: Param[]): Item[] {
  const items: Item[] = [];
  for (const param of params) {
    const { value } = param;
    if (Array.isArray(value)) {
      for (const row of value) {
        if (Array.isArray(row)) for (const cell of row) items.push({ value: cell, literal: false });
        else items.push({ value: row, literal: false });
      }
    } else {
      items.push({ value, literal: !param.isCellRef && !param.isRangeRef });
    }
  }
  for (const item of items) if (item.value instanceof FormulaError) throw item.value;
  return items;
}

/** A 2-D range argument, as rows of raw values. A single value becomes 1×1. */
function grid(param: Param): unknown[][] {
  const { value } = param;
  if (Array.isArray(value)) return value.map((row) => (Array.isArray(row) ? row : [row]));
  return [[value]];
}

function scalar(param: Param | undefined): unknown {
  if (!param) return undefined;
  const { value } = param;
  if (Array.isArray(value)) return Array.isArray(value[0]) ? value[0][0] : value[0];
  if (value instanceof FormulaError) throw value;
  return value;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  if (Number.isNaN(n)) throw FormulaError.VALUE;
  return n;
}

/**
 * Numbers among the arguments, by Excel's rule: in a range only real numbers
 * count (text and blanks are skipped); a value typed straight into the call
 * is converted if it can be.
 */
function numbers(params: Param[]): number[] {
  const out: number[] = [];
  for (const { value, literal } of flatten(params)) {
    if (typeof value === "number") out.push(value);
    else if (literal && typeof value === "boolean") out.push(value ? 1 : 0);
    else if (literal && typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      out.push(Number(value));
    }
  }
  return out;
}

const isBlank = (value: unknown) => value === null || value === undefined || value === "";

/** Characters with a meaning in a regular expression. */
const REGEX_SPECIAL = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\", "/"]);

function escapeChar(ch: string) {
  return REGEX_SPECIAL.has(ch) ? "\\" + ch : ch;
}

/**
 * Excel's wildcard text match as a regular expression: `*` is any run of
 * characters, `?` exactly one, and `~` escapes the next `*`, `?` or `~`.
 *
 * Built by scanning characters rather than by chained string replacements:
 * those need a placeholder for an escaped wildcard, and any placeholder is a
 * character someone could legitimately type.
 */
function wildcardPattern(operand: string) {
  let source = "";
  for (let i = 0; i < operand.length; i += 1) {
    const ch = operand[i];
    const next = operand[i + 1];
    if (ch === "~" && (next === "*" || next === "?" || next === "~")) {
      source += escapeChar(next);
      i += 1;
    } else if (ch === "*") {
      source += "[\\s\\S]*";
    } else if (ch === "?") {
      source += "[\\s\\S]";
    } else {
      source += escapeChar(ch);
    }
  }
  return new RegExp("^" + source + "$", "i");
}

/**
 * Parses an Excel criterion — `">5"`, `"<>done"`, `"a*"`, `3` — into a test.
 *
 * Text comparison is case-insensitive and supports the `*` and `?` wildcards,
 * as Excel's do; numeric comparison applies when both sides are numbers.
 */
function criterion(raw: unknown): (value: unknown) => boolean {
  if (typeof raw === "number" || typeof raw === "boolean") {
    return (value) =>
      value === raw || (typeof value === "string" && value.trim() !== "" && Number(value) === raw);
  }

  const text = String(raw ?? "");
  const match = /^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(text)!;
  const op = match[1] ?? "=";
  const operand = match[2];
  const operandNumber =
    operand.trim() !== "" && !Number.isNaN(Number(operand)) ? Number(operand) : null;

  if (operandNumber !== null) {
    return (value) => {
      const n =
        typeof value === "number"
          ? value
          : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : NaN;
      if (Number.isNaN(n)) return op === "<>";
      switch (op) {
        case "<": return n < operandNumber;
        case ">": return n > operandNumber;
        case "<=": return n <= operandNumber;
        case ">=": return n >= operandNumber;
        case "<>": return n !== operandNumber;
        default: return n === operandNumber;
      }
    };
  }

  // "=" with nothing after it means "is blank"; "<>" alone means "is not".
  if (operand === "") {
    return op === "<>" ? (value) => !isBlank(value) : (value) => isBlank(value);
  }

  const pattern = wildcardPattern(operand);
  const equals = (value: unknown) => !isBlank(value) && pattern.test(String(value));

  switch (op) {
    case "<>": return (value) => !equals(value);
    case "=": return equals;
    default: {
      // Ordered comparison between texts, as Excel does it: case-insensitive.
      const target = operand.toLowerCase();
      return (value) => {
        if (typeof value !== "string") return false;
        const v = value.toLowerCase();
        if (op === "<") return v < target;
        if (op === ">") return v > target;
        if (op === "<=") return v <= target;
        return v >= target;
      };
    }
  }
}

/**
 * The cells that satisfy every (range, criterion) pair of a *IFS function.
 * Ranges must all be the same shape, as Excel requires.
 */
function matchingCells(pairs: Param[]): boolean[][] {
  if (pairs.length === 0 || pairs.length % 2 !== 0) throw FormulaError.VALUE;
  const ranges: unknown[][][] = [];
  const tests: ((value: unknown) => boolean)[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    ranges.push(grid(pairs[i]));
    tests.push(criterion(scalar(pairs[i + 1])));
  }
  const rows = ranges[0].length;
  const cols = ranges[0][0]?.length ?? 0;
  if (ranges.some((r) => r.length !== rows || (r[0]?.length ?? 0) !== cols)) {
    throw FormulaError.VALUE;
  }

  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ranges.every((range, i) => tests[i](range[r][c]))),
  );
}

function pick(target: Param, mask: boolean[][]): number[] {
  const values = grid(target);
  const out: number[] = [];
  mask.forEach((row, r) =>
    row.forEach((ok, c) => {
      const value = values[r]?.[c];
      if (value instanceof FormulaError) throw value;
      if (ok && typeof value === "number") out.push(value);
    }),
  );
  return out;
}

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);

function sorted(list: number[]) {
  return [...list].sort((a, b) => a - b);
}

function median(list: number[]) {
  if (!list.length) throw FormulaError.NUM;
  const s = sorted(list);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stdevSample(list: number[]) {
  if (list.length < 2) throw FormulaError.DIV0;
  const mean = sum(list) / list.length;
  return Math.sqrt(sum(list.map((x) => (x - mean) ** 2)) / (list.length - 1));
}

function percentileInc(list: number[], k: number) {
  if (!list.length || k < 0 || k > 1) throw FormulaError.NUM;
  const s = sorted(list);
  const rank = k * (s.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  return s[lo] + (s[hi] - s[lo]) * (rank - lo);
}

/** Index of `needle` in a one-dimensional `haystack`, by Excel's MATCH rules. */
function matchIndex(needle: unknown, haystack: unknown[], mode: number): number {
  if (mode === 0) {
    const test = typeof needle === "string" ? criterion(needle) : null;
    const index = haystack.findIndex((value) => (test ? test(value) : value === needle));
    if (index < 0) throw FormulaError.NA;
    return index;
  }

  // Approximate match assumes sorted data, as Excel does: 1 finds the largest
  // value ≤ needle (ascending), -1 the smallest ≥ needle (descending).
  let found = -1;
  for (let i = 0; i < haystack.length; i += 1) {
    const value = haystack[i];
    if (isBlank(value)) continue;
    const cmp =
      typeof value === "number" && typeof needle === "number"
        ? value - needle
        : String(value).toLowerCase().localeCompare(String(needle).toLowerCase());
    if (mode > 0 ? cmp <= 0 : cmp >= 0) found = i;
    else break;
  }
  if (found < 0) throw FormulaError.NA;
  return found;
}

function oneDimensional(param: Param): unknown[] {
  const g = grid(param);
  if (g.length === 1) return g[0];
  if (g.every((row) => row.length === 1)) return g.map((row) => row[0]);
  throw FormulaError.NA;
}

const IMPLEMENTATIONS: Record<string, (...args: Param[]) => unknown> = {
  MIN: (...params) => {
    const list = numbers(params);
    return list.length ? Math.min(...list) : 0;
  },
  MAX: (...params) => {
    const list = numbers(params);
    return list.length ? Math.max(...list) : 0;
  },
  MEDIAN: (...params) => median(numbers(params)),

  COUNTA: (...params) => flatten(params).filter((item) => !isBlank(item.value)).length,
  COUNTBLANK: (...params) => flatten(params).filter((item) => isBlank(item.value)).length,

  LARGE: (range, k) => {
    const list = sorted(numbers([range])).reverse();
    const n = toNumber(scalar(k));
    if (n < 1 || n > list.length) throw FormulaError.NUM;
    return list[Math.floor(n) - 1];
  },
  SMALL: (range, k) => {
    const list = sorted(numbers([range]));
    const n = toNumber(scalar(k));
    if (n < 1 || n > list.length) throw FormulaError.NUM;
    return list[Math.floor(n) - 1];
  },

  STDEV: (...params) => stdevSample(numbers(params)),
  "STDEV.S": (...params) => stdevSample(numbers(params)),
  PERCENTILE: (range, k) => percentileInc(numbers([range]), toNumber(scalar(k))),
  "PERCENTILE.INC": (range, k) => percentileInc(numbers([range]), toNumber(scalar(k))),

  MODE: (...params) => {
    const counts = new Map<number, number>();
    let best: number | null = null;
    let bestCount = 1;
    for (const n of numbers(params)) {
      const c = (counts.get(n) ?? 0) + 1;
      counts.set(n, c);
      if (c > bestCount) {
        best = n;
        bestCount = c;
      }
    }
    if (best === null) throw FormulaError.NA;
    return best;
  },

  RANK: (value, range, order) => {
    const target = toNumber(scalar(value));
    const list = numbers([range]);
    if (!list.includes(target)) throw FormulaError.NA;
    const ascending = order ? toNumber(scalar(order)) !== 0 : false;
    return 1 + list.filter((n) => (ascending ? n < target : n > target)).length;
  },

  // The single-criterion forms are overridden too, not only added: the
  // library's own COUNTIF/SUMIF/AVERAGEIF do not anchor their wildcards, so
  // COUNTIF(A:A, "a*") counted every non-empty cell. Routing all of them
  // through `criterion` keeps one set of matching rules across every *IF.
  COUNTIF: (range, test) => matchingCells([range, test]).flat().filter(Boolean).length,
  SUMIF: (range, test, sumRange) =>
    sum(pick(sumRange ?? range, matchingCells([range, test]))),
  AVERAGEIF: (range, test, averageRange) => {
    const list = pick(averageRange ?? range, matchingCells([range, test]));
    if (!list.length) throw FormulaError.DIV0;
    return sum(list) / list.length;
  },

  SUMIFS: (sumRange, ...pairs) => sum(pick(sumRange, matchingCells(pairs))),
  COUNTIFS: (...pairs) => matchingCells(pairs).flat().filter(Boolean).length,
  AVERAGEIFS: (averageRange, ...pairs) => {
    const list = pick(averageRange, matchingCells(pairs));
    if (!list.length) throw FormulaError.DIV0;
    return sum(list) / list.length;
  },
  MINIFS: (range, ...pairs) => {
    const list = pick(range, matchingCells(pairs));
    return list.length ? Math.min(...list) : 0;
  },
  MAXIFS: (range, ...pairs) => {
    const list = pick(range, matchingCells(pairs));
    return list.length ? Math.max(...list) : 0;
  },

  UPPER: (text) => String(scalar(text) ?? "").toUpperCase(),
  SUBSTITUTE: (text, find, replacement, instance) => {
    const source = String(scalar(text) ?? "");
    const needle = String(scalar(find) ?? "");
    const next = String(scalar(replacement) ?? "");
    if (!needle) return source;
    if (instance === undefined) return source.split(needle).join(next);
    const nth = toNumber(scalar(instance));
    if (nth < 1) throw FormulaError.VALUE;
    let from = 0;
    for (let i = 1; ; i += 1) {
      const at = source.indexOf(needle, from);
      if (at < 0) return source;
      if (i === nth) return source.slice(0, at) + next + source.slice(at + needle.length);
      from = at + needle.length;
    }
  },
  VALUE: (text) => {
    const value = scalar(text);
    if (typeof value === "number") return value;
    const trimmed = String(value ?? "").trim();
    const n = Number(trimmed.split(",").join(""));
    if (trimmed === "" || Number.isNaN(n)) throw FormulaError.VALUE;
    return n;
  },
  CHOOSE: (index, ...options) => {
    const n = Math.floor(toNumber(scalar(index)));
    if (n < 1 || n > options.length) throw FormulaError.VALUE;
    return scalar(options[n - 1]);
  },

  MATCH: (needle, haystack, mode) =>
    matchIndex(
      scalar(needle),
      oneDimensional(haystack),
      mode === undefined ? 1 : toNumber(scalar(mode)),
    ) + 1,

  XLOOKUP: (needle, lookup, results, ifNotFound) => {
    const keys = oneDimensional(lookup);
    const values = oneDimensional(results);
    if (keys.length !== values.length) throw FormulaError.VALUE;
    try {
      return values[matchIndex(scalar(needle), keys, 0)];
    } catch (error) {
      if (error === FormulaError.NA && ifNotFound !== undefined) return scalar(ifNotFound);
      throw error;
    }
  },
};

type Context = { utils: { extractRefValue: (arg: unknown) => { val: unknown; isArray: boolean } } };

/**
 * A parser context object, as opposed to an argument.
 *
 * The library keeps lists of function names that receive its internal context
 * as their first argument, and prepends that context to *any* function
 * registered under such a name — whether or not the library implements it.
 * CHOOSE and SUMIF are both on those lists. A context carries `utils`; no
 * argument does.
 */
function isContext(arg: unknown): arg is Context {
  return typeof arg === "object" && arg !== null && "utils" in arg && !("value" in arg);
}

/**
 * One argument, in the wrapped shape every implementation above expects.
 *
 * Functions on the library's "no data retrieve" list (SUMIF, AVERAGEIF…) get
 * their arguments raw — a range arrives as `{ ref: { from, to } }` rather than
 * as its values — and are expected to resolve them through the context. Doing
 * that here means each implementation is written once, against values, and
 * does not care which list its name is on.
 */
function resolve(context: Context, arg: unknown): Param {
  if (typeof arg === "object" && arg !== null && "value" in arg) return arg as Param;
  if (arg === null || arg === undefined) return { value: null };
  const ref = (arg as { ref?: { from?: unknown } }).ref;
  const { val, isArray } = context.utils.extractRefValue(arg);
  return {
    value: val,
    isArray,
    isRangeRef: Boolean(ref && ref.from),
    isCellRef: Boolean(ref && !ref.from),
  };
}

/**
 * The functions, in the shape the parser registers them: any leading context
 * is consumed and every argument resolved to a value, so each implementation
 * above sees the same kind of input whichever list the library puts it on.
 */
export const EXTRA_FUNCTIONS: Record<string, (...args: unknown[]) => unknown> =
  Object.fromEntries(
    Object.entries(IMPLEMENTATIONS).map(([name, fn]) => [
      name,
      (...args: unknown[]) => {
        const [first, ...rest] = args;
        if (!isContext(first)) return fn(...(args as Param[]));
        // An omitted optional argument stays undefined, so `sumRange ?? range`
        // falls back as it should instead of summing an empty value.
        return fn(...(rest.map((arg) => (arg == null ? undefined : resolve(first, arg))) as Param[]));
      },
    ]),
  );
