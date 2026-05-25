/**
 * Append-only JSONL storage for journal entries.
 *
 * Layout: data/journal/YYYY-MM-DD.jsonl — one entry per line, written
 * atomically with appendFile. Reads scan the requested day(s) only,
 * so large histories don't slow the panel down.
 *
 * Auto-rotation: callers can prune files older than N days with
 * pruneJournalsOlderThan().
 */

import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "fs/promises";
import path from "path";
import type { JournalEntry, JournalListFilter } from "./types";

const JOURNAL_DIR = path.join(process.cwd(), "data", "journal");
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

function dateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateFilePath(key: string): string {
  return path.join(JOURNAL_DIR, `${key}.jsonl`);
}

/** Append a single entry. Non-fatal on disk errors. */
export async function persistEntry(entry: JournalEntry): Promise<void> {
  try {
    await mkdir(JOURNAL_DIR, { recursive: true });
    const key = entry.startedAt.slice(0, 10);
    const file = dateFilePath(key);
    await appendFile(file, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Disk full, perms error, etc. — journal is best-effort; never break the
    // action that triggered it.
  }
}

/** Read one full day's entries (oldest → newest). */
async function readDay(key: string): Promise<JournalEntry[]> {
  try {
    const raw = await readFile(dateFilePath(key), "utf8");
    const out: JournalEntry[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        out.push(JSON.parse(trimmed) as JournalEntry);
      } catch {
        // Skip corrupt line.
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** List entries matching the given filter, newest-first. */
export async function listEntries(
  filter: JournalListFilter = {},
): Promise<{ entries: JournalEntry[]; total: number; scannedDays: string[] }> {
  const limit = Math.min(Math.max(filter.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const days = Math.min(Math.max(filter.days ?? DEFAULT_DAYS, 1), MAX_DAYS);

  const keys: string[] = [];
  if (filter.date) {
    keys.push(filter.date);
  } else {
    const now = new Date();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      keys.push(dateKey(d));
    }
  }

  const all: JournalEntry[] = [];
  for (const k of keys) {
    const dayEntries = await readDay(k);
    all.push(...dayEntries);
  }

  const userMatch = filter.user?.toLowerCase();
  const actionPrefix = filter.action?.toLowerCase();
  const domain = filter.domain?.toLowerCase();

  const filtered = all.filter((e) => {
    if (userMatch && !e.username.toLowerCase().includes(userMatch)) return false;
    if (actionPrefix && !e.action.toLowerCase().startsWith(actionPrefix)) {
      return false;
    }
    if (filter.failuresOnly && e.ok) return false;
    if (domain && e.target?.domain?.toLowerCase() !== domain) return false;
    return true;
  });

  filtered.sort((a, b) => (b.startedAt < a.startedAt ? -1 : 1));
  return {
    entries: filtered.slice(0, limit),
    total: filtered.length,
    scannedDays: keys,
  };
}

/** Get a single entry by ID. Scans the last `days` files. */
export async function getEntry(
  id: string,
  daysBack = DEFAULT_DAYS,
): Promise<JournalEntry | null> {
  const now = new Date();
  for (let i = 0; i < daysBack; i += 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const entries = await readDay(dateKey(d));
    const hit = entries.find((e) => e.id === id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Per-file mutex chain for the read-modify-write done by markEntryUndone.
 *
 * Two parallel undo requests landing on the same day file would otherwise race:
 *   - undo A reads file → mutates in memory → starts writing tmp
 *   - undo B reads file (without A's update!) → mutates → starts writing tmp
 *   - both rename(tmp → file); whoever lands last clobbers the other.
 * The mutex serializes rewrites per JSONL path while leaving append-only
 * persistEntry() untouched (kernel append is atomic for small writes).
 */
const fileLocks = new Map<string, Promise<unknown>>();

async function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(file) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  fileLocks.set(
    file,
    next.catch(() => undefined),
  );
  try {
    return await next;
  } finally {
    // Allow GC of completed chains so the map can't grow unboundedly.
    if (fileLocks.get(file) === next) fileLocks.delete(file);
  }
}

/**
 * Mark a single entry as undone — rewrites the per-day JSONL file in place
 * with the entry's undoneAt / undoneBy / undoneByEntryId fields set.
 *
 * The journal is normally append-only, but Undo is a low-frequency action
 * (~once per minute at most across the whole panel) and we'd rather have
 * the source of truth in one place than maintain a sidecar undo-events
 * file that the reader has to cross-reference. Writes go via rename for
 * atomicity on the same filesystem, and the read-modify-write is serialized
 * per file via withFileLock to prevent lost updates between concurrent undos.
 */
export async function markEntryUndone(
  id: string,
  by: string,
  undoEntryId: string,
  daysBack = 30,
): Promise<JournalEntry | null> {
  const now = new Date();
  for (let i = 0; i < daysBack; i += 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dateKey(d);
    const file = dateFilePath(key);
    const found = await withFileLock(file, async () => {
      let raw: string;
      try {
        raw = await readFile(file, "utf8");
      } catch {
        return null;
      }
      const lines = raw.split("\n");
      let hit: JournalEntry | null = null;
      const updated = lines.map((line) => {
        const t = line.trim();
        if (!t.startsWith("{")) return line;
        try {
          const e = JSON.parse(t) as JournalEntry;
          if (e.id === id) {
            e.undoneAt = new Date().toISOString();
            e.undoneBy = by;
            e.undoneByEntryId = undoEntryId;
            e.undoable = false;
            hit = e;
            return JSON.stringify(e);
          }
        } catch {
          /* leave line as-is */
        }
        return line;
      });
      if (!hit) return null;
      const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await writeFile(tmp, updated.join("\n"), "utf8");
      await rename(tmp, file);
      return hit;
    });
    if (found) return found;
  }
  return null;
}

/** Remove journal files older than the cutoff. Returns paths removed. */
export async function pruneJournalsOlderThan(days: number): Promise<string[]> {
  const removed: string[] = [];
  try {
    const files = await readdir(JOURNAL_DIR);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    for (const f of files) {
      if (!/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)) continue;
      const full = path.join(JOURNAL_DIR, f);
      const s = await stat(full);
      if (s.mtimeMs < cutoff) {
        await unlink(full);
        removed.push(full);
      }
    }
  } catch {
    // ignore
  }
  return removed;
}
