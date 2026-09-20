import { appendFileSync } from "node:fs";
export function probe(where: string, data: unknown) {
  try {
    appendFileSync("probe.log", `${new Date().toISOString()} ${where} ${JSON.stringify(data)}
`);
  } catch {}
}
