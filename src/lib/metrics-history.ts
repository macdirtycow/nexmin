import fs from "fs/promises";
import path from "path";

const HISTORY = path.join(process.cwd(), "data", "metrics-history.jsonl");
/** Keep at most ~45 days of hourly snapshots in the file. */
const MAX_RETENTION_MS = 45 * 24 * 3600 * 1000;

export interface MetricsSnapshot {
  ts: string;
  load1: number;
  load5: number;
  load15: number;
  uptimeSec: number;
  memUsedKb: number;
  memTotalKb: number;
  diskRootUsePct: number;
}

export async function readMetricsHistory(hours = 24): Promise<MetricsSnapshot[]> {
  const since = Date.now() - hours * 3600 * 1000;
  let raw = "";
  try {
    raw = await fs.readFile(HISTORY, "utf8");
  } catch {
    return [];
  }
  const rows: MetricsSnapshot[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line) as MetricsSnapshot;
      if (new Date(row.ts).getTime() >= since) rows.push(row);
    } catch {
      /* skip */
    }
  }
  const sorted = rows.sort((a, b) => a.ts.localeCompare(b.ts));
  const pruneBefore = Date.now() - MAX_RETENTION_MS;
  const pruned = sorted.filter((r) => new Date(r.ts).getTime() >= pruneBefore);
  if (pruned.length < sorted.length && sorted.length > 0) {
    void fs
      .writeFile(
        HISTORY,
        `${pruned.map((r) => JSON.stringify(r)).join("\n")}\n`,
        "utf8",
      )
      .catch(() => {});
  }
  return pruned;
}
