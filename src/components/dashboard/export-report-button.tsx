"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { slug } from "@/lib/sheet-io";

/**
 * One CSV row. Quoted whenever the value could otherwise break the row, and a
 * leading =, +, - or @ is prefixed with a quote so a spreadsheet treats it as
 * text rather than a formula.
 */
function toCsvRow(cells: string[]) {
  return cells
    .map((cell) => {
      const safe = /^[=+\-@]/.test(cell) ? `'${cell}` : cell;
      return /["\n,]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
    })
    .join(",");
}

/**
 * Downloads a report's figures as a CSV.
 *
 * The rows are built on the server, where the numbers already are, and travel
 * as plain strings — so the file always says exactly what the screen does, and
 * this component is only responsible for turning them into a download.
 */
export function ExportReportButton({
  rows,
  name,
  today,
  label = "Export Report",
}: {
  rows: string[][];
  /** Goes into the filename: "<name>-<today>.csv". */
  name: string;
  /** Resolved server-side, so the filename cannot differ by timezone. */
  today: string;
  label?: string;
}) {
  function download() {
    // The byte-order mark is what makes Excel read it as UTF-8 rather than guess.
    const csv = `﻿${rows.map(toCsvRow).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(name)}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download}>
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
