/**
 * Reading and writing sheets as .xlsx and .csv files, in the browser.
 *
 * ExcelJS is loaded with a dynamic `import()` only when a file is actually
 * imported or exported — it is several hundred kilobytes, and most visits to a
 * sheet never touch a file.
 *
 * Parsing happens here, client-side, so the server only ever receives plain
 * sheet content, validated like any other save. No binary format is handled
 * by a server action.
 */

import type { CellFormat, NumberFormat, SheetFormats } from "@/lib/domain";
import { displayValue, formatKey, SHEET_MAX_CELL_LENGTH, SHEET_MAX_COLS, SHEET_MAX_ROWS } from "@/lib/sheet-model";
import { evaluateSheet, isErrorValue, literalValue } from "@/lib/sheet-formulas";

/** A worksheet as it will be sent to `importSheetsAction`. */
export type ImportedSheet = {
  name: string;
  cells: string[][];
  rowCount: number;
  colCount: number;
  formats: SheetFormats;
  colWidths: number[];
  frozenRows: number;
};

/** What was cut to fit, so the person can be told rather than surprised. */
export type ImportReport = { sheets: ImportedSheet[]; truncated: string[] };

// Excel measures column width in characters of the default font; ~7px each
// plus padding is the conventional conversion.
const charsToPx = (chars: number) => Math.round(chars * 7 + 5);
const pxToChars = (px: number) => Math.max(1, Math.round((px - 5) / 7));

/** Excel's own name rules: ≤31 characters, none of []:*?/\ . */
function excelSheetName(name: string) {
  const cleaned = name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31);
  return cleaned || "Sheet1";
}

function cleanName(name: string, fallback: string) {
  const trimmed = name.trim().slice(0, 60);
  return trimmed || fallback;
}

// --- Number formats ----------------------------------------------------------

/** Maps an Excel number-format code onto the handful this grid offers. */
function fromExcelFormat(code: string | undefined): Pick<CellFormat, "numberFormat" | "decimals"> {
  if (!code || code === "General" || code === "@") return {};
  const decimals = (/\.(0+)/.exec(code)?.[1].length ?? 0) || undefined;
  if (code.includes("%")) return { numberFormat: "percent", decimals };
  if (/[$€£¥]|\[\$/.test(code)) return { numberFormat: "currency", decimals: decimals ?? 2 };
  // A date format mentions day/month/year and is not a pure time format.
  if (/(^|[^"\\])[dmy]/i.test(code.replace(/"[^"]*"/g, "")) && !/^\[?h/i.test(code)) {
    return { numberFormat: "date" };
  }
  if (/[#0]/.test(code)) return { numberFormat: "number", decimals: decimals ?? 0 };
  return {};
}

function toExcelFormat(format: NumberFormat | undefined, decimals: number | undefined) {
  const places = (count: number) => (count > 0 ? "." + "0".repeat(count) : "");
  switch (format) {
    case "number":
      return "#,##0" + places(decimals ?? 2);
    case "currency":
      return "$#,##0" + places(decimals ?? 2);
    case "percent":
      return "0" + places(decimals ?? 0) + "%";
    case "date":
      return "yyyy-mm-dd";
    default:
      return decimals !== undefined ? "0" + places(decimals) : undefined;
  }
}

// --- Import --------------------------------------------------------------------

/** Excel serial for a JS Date, counted from 1899-12-30 as Excel does. */
function dateToSerial(date: Date) {
  return (date.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000;
}

type ExcelCellValue =
  | null
  | undefined
  | number
  | string
  | boolean
  | Date
  | { formula?: string; sharedFormula?: string; result?: unknown }
  | { richText: { text: string }[] }
  | { text: string; hyperlink?: string }
  | { error: string };

/**
 * One cell's content as the text this grid stores.
 *
 * Formulas keep their formula (ExcelJS resolves shared formulas to each cell's
 * own text through `cell.formula`); everything else becomes its plain value.
 */
function cellText(value: ExcelCellValue, formula: string | undefined): string {
  if (formula) return `=${formula}`;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return String(dateToSerial(value));
  // Booleans as Excel writes them, so `literalValue` reads them back as such.
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text;
  if ("error" in value) return value.error;
  if ("result" in value && value.result !== undefined) return String(value.result);
  return "";
}

/**
 * Reads an .xlsx workbook into sheets this grid can hold.
 *
 * Anything beyond the grid's limits is cut, and the report says so per
 * worksheet — silently dropping row 501 of a budget is how numbers go wrong.
 */
export async function readWorkbook(file: Pick<File, "arrayBuffer">): Promise<ImportReport> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheets: ImportedSheet[] = [];
  const truncated: string[] = [];

  workbook.eachSheet((worksheet) => {
    const sourceRows = worksheet.actualRowCount ? worksheet.rowCount : 0;
    const sourceCols = worksheet.actualColumnCount ? worksheet.columnCount : 0;
    const rowCount = Math.max(1, Math.min(sourceRows, SHEET_MAX_ROWS));
    const colCount = Math.max(1, Math.min(sourceCols, SHEET_MAX_COLS));

    if (sourceRows > SHEET_MAX_ROWS || sourceCols > SHEET_MAX_COLS) {
      truncated.push(
        `${worksheet.name}: ${sourceRows}×${sourceCols} cut to ${rowCount}×${colCount}`,
      );
    }

    const cells: string[][] = Array.from({ length: rowCount }, () =>
      Array.from({ length: colCount }, () => ""),
    );
    const formats: SheetFormats = {};

    for (let r = 1; r <= rowCount; r += 1) {
      const row = worksheet.getRow(r);
      for (let c = 1; c <= colCount; c += 1) {
        const cell = row.getCell(c);
        const formula = (cell as unknown as { formula?: string }).formula || undefined;
        cells[r - 1][c - 1] = cellText(cell.value as ExcelCellValue, formula).slice(
          0,
          SHEET_MAX_CELL_LENGTH,
        );

        const format: CellFormat = {
          ...(cell.font?.bold ? { bold: true } : {}),
          ...(cell.font?.italic ? { italic: true } : {}),
          ...(cell.alignment?.horizontal === "center" ||
          cell.alignment?.horizontal === "right" ||
          cell.alignment?.horizontal === "left"
            ? { align: cell.alignment.horizontal }
            : {}),
          ...fromExcelFormat(cell.numFmt),
        };
        // A Date value is a date whatever its format code says.
        if (cell.value instanceof Date) format.numberFormat = "date";
        if (Object.keys(format).length) formats[formatKey(r - 1, c - 1)] = format;
      }
    }

    const colWidths = Array.from({ length: colCount }, (_, c) => {
      const width = worksheet.getColumn(c + 1).width;
      return typeof width === "number" ? charsToPx(width) : 120;
    });

    const view = worksheet.views?.[0] as { state?: string; ySplit?: number } | undefined;
    const frozenRows = view?.state === "frozen" && (view.ySplit ?? 0) >= 1 ? 1 : 0;

    sheets.push({
      name: cleanName(worksheet.name, `Sheet ${sheets.length + 1}`),
      cells,
      rowCount,
      colCount,
      formats,
      colWidths,
      frozenRows,
    });
  });

  return { sheets, truncated };
}

/**
 * Parses CSV per RFC 4180: quoted fields may hold commas, quotes (doubled) and
 * line breaks. A byte-order mark — which Excel writes — is stripped.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Reads a .csv file into one sheet, named after the file. */
export async function readCsv(file: File): Promise<ImportReport> {
  const rows = parseCsv(await file.text());
  const sourceRows = rows.length;
  const sourceCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const rowCount = Math.max(1, Math.min(sourceRows, SHEET_MAX_ROWS));
  const colCount = Math.max(1, Math.min(sourceCols, SHEET_MAX_COLS));

  const cells = Array.from({ length: rowCount }, (_, r) =>
    Array.from({ length: colCount }, (_, c) => (rows[r]?.[c] ?? "").slice(0, SHEET_MAX_CELL_LENGTH)),
  );

  const name = cleanName(file.name.replace(/\.csv$/i, ""), "Imported");
  return {
    sheets: [
      { name, cells, rowCount, colCount, formats: {}, colWidths: [], frozenRows: 0 },
    ],
    truncated:
      sourceRows > SHEET_MAX_ROWS || sourceCols > SHEET_MAX_COLS
        ? [`${name}: ${sourceRows}×${sourceCols} cut to ${rowCount}×${colCount}`]
        : [],
  };
}

// --- Export --------------------------------------------------------------------

type ExportableSheet = {
  name: string;
  cells: string[][];
  formats: SheetFormats;
  colWidths: number[];
  frozenRows: number;
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lower-cased, hyphenated — safe in a filename on every platform. */
export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sheet";
}

/**
 * Writes the sheet as a real .xlsx: formulas stay formulas (with their last
 * computed result cached, as Excel itself stores them, so the file shows
 * values even in viewers that do not recalculate), and formatting, column
 * widths and the frozen header row carry over.
 */
export async function buildXlsx(sheet: ExportableSheet): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(excelSheetName(sheet.name), {
    views: sheet.frozenRows ? [{ state: "frozen", ySplit: 1 }] : [],
  });

  const values = evaluateSheet(sheet.cells, sheet.name);

  sheet.cells.forEach((row, r) => {
    row.forEach((raw, c) => {
      if (!raw && !sheet.formats[formatKey(r, c)]) return;
      const cell = worksheet.getCell(r + 1, c + 1);

      if (raw.startsWith("=") && raw.length > 1) {
        const result = values[r][c];
        cell.value = {
          formula: raw.slice(1),
          result: isErrorValue(result) ? { error: result.error } : (result ?? undefined),
        } as never;
      } else {
        const literal = literalValue(raw);
        cell.value = literal === null ? null : (literal as string | number | boolean);
      }

      const format = sheet.formats[formatKey(r, c)];
      if (format?.bold || format?.italic) cell.font = { bold: !!format.bold, italic: !!format.italic };
      if (format?.align) cell.alignment = { horizontal: format.align };
      const numFmt = toExcelFormat(format?.numberFormat, format?.decimals);
      if (numFmt) cell.numFmt = numFmt;
    });
  });

  sheet.colWidths.forEach((px, c) => {
    worksheet.getColumn(c + 1).width = pxToChars(px);
  });

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Builds the .xlsx and hands it to the browser as a download. */
export async function exportXlsx(sheet: ExportableSheet, filename: string) {
  const buffer = await buildXlsx(sheet);
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

/** RFC 4180 quoting — commas, quotes and newlines all have to survive Excel. */
function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Writes the sheet as CSV — computed values, as they are displayed, since CSV
 * has nowhere to keep a formula. Trailing empty rows and columns are trimmed:
 * they are an artefact of the grid's size, not content.
 */
export function buildCsv(sheet: ExportableSheet): string {
  const values = evaluateSheet(sheet.cells, sheet.name);
  const shown = values.map((row, r) =>
    row.map((value, c) => displayValue(value, sheet.formats[formatKey(r, c)])),
  );

  const lastRow = shown.reduce((last, row, r) => (row.some(Boolean) ? r : last), -1);
  const lastCol = shown.reduce(
    (last, row) => row.reduce((inner, cell, c) => (cell ? Math.max(inner, c) : inner), last),
    -1,
  );

  // A byte-order mark, so Excel opens the file as UTF-8 rather than guessing.
  return (
    "\uFEFF" +
    shown
      .slice(0, lastRow + 1)
      .map((row) => row.slice(0, lastCol + 1).map(csvCell).join(","))
      .join("\r\n")
  );
}

/** Builds the CSV and hands it to the browser as a download. */
export function exportCsv(sheet: ExportableSheet, filename: string) {
  download(new Blob([buildCsv(sheet)], { type: "text/csv;charset=utf-8;" }), filename);
}
