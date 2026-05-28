import "server-only";

import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";

const LOG_PATH = path.join(process.cwd(), "data", "audit.log");
const TAIL_BYTES = 512 * 1024;

export type AuditEntry = {
  ts: string;
  username: string;
  action: string;
  domain?: string;
  detail?: string;
};

export type AuditQuery = {
  limit?: number;
  action?: string;
  username?: string;
  since?: string;
};

function parseLine(line: string): AuditEntry | null {
  try {
    const o = JSON.parse(line) as AuditEntry;
    if (!o.ts || !o.action) return null;
    return o;
  } catch {
    return null;
  }
}

async function readLogTail(): Promise<string[]> {
  try {
    const s = await stat(LOG_PATH);
    if (s.size <= TAIL_BYTES) {
      const raw = await readFile(LOG_PATH, "utf8");
      return raw.trim().split("\n").filter(Boolean);
    }
    const fh = await open(LOG_PATH, "r");
    const start = s.size - TAIL_BYTES;
    const buf = Buffer.alloc(s.size - start);
    await fh.read(buf, 0, buf.length, start);
    await fh.close();
    const chunk = buf.toString("utf8");
    const lines = chunk.split("\n").filter(Boolean);
    if (lines.length > 0 && !lines[0].startsWith("{")) lines.shift();
    return lines;
  } catch {
    return [];
  }
}

export async function readAuditEntries(
  query: AuditQuery = {},
): Promise<{ entries: AuditEntry[]; scannedLines: number }> {
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 2000);
  const actionFilter = query.action?.trim().toLowerCase();
  const userFilter = query.username?.trim().toLowerCase();
  const sinceMs = query.since ? Date.parse(query.since) : NaN;

  const lines = await readLogTail();
  const entries: AuditEntry[] = [];

  for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
    const row = parseLine(lines[i]!);
    if (!row) continue;
    if (actionFilter && !row.action.toLowerCase().includes(actionFilter)) continue;
    if (userFilter && !row.username.toLowerCase().includes(userFilter)) continue;
    if (Number.isFinite(sinceMs) && Date.parse(row.ts) < sinceMs) continue;
    entries.push(row);
  }

  return { entries, scannedLines: lines.length };
}

export async function countAuditActions(
  action: string,
  sinceMs: number,
): Promise<number> {
  const { entries, scannedLines } = await readAuditEntries({
    limit: 2000,
    action,
    since: new Date(sinceMs).toISOString(),
  });
  void scannedLines;
  return entries.filter((e) => e.action === action).length;
}
