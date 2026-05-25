/**
 * Server-side Undo dispatcher.
 *
 * Each undoable action sets a `JournalEntry.undoSpec = { kind, payload }`
 * at write-time. To undo, the admin POSTs to
 * `/api/admin/journal/:id/undo`; this module resolves the kind to a
 * handler and runs it.
 *
 * Design: a single dispatch table (no plug-in registry) — simpler than
 * dynamic registration and avoids module-load order pitfalls in Next.js
 * route handlers. Adding a new undoable kind = add a case below.
 *
 * Safety:
 *  - Handlers MUST be idempotent or safe to fail mid-way; we don't crash
 *    the panel on a botched undo.
 *  - Handlers MUST refuse to operate on the wrong target (e.g. delete a
 *    mailbox in a different domain than was created).
 *  - TTL is checked by the caller before this module is invoked.
 */

import { getProvisioner } from "@/lib/provisioner";
import type { SessionPayload } from "@/lib/types";
import type { JournalEntry } from "./types";

type Session = SessionPayload;

export interface UndoResult {
  ok: boolean;
  summary: string;
}

export interface UndoContext {
  session: Session;
  entry: JournalEntry;
}

export class UndoNotSupportedError extends Error {
  constructor(kind: string) {
    super(`No undo handler registered for kind "${kind}".`);
    this.name = "UndoNotSupportedError";
  }
}

export class UndoRejectedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "UndoRejectedError";
  }
}

/**
 * Look up and run the undo handler for the entry's undoSpec.kind.
 * Throws UndoNotSupportedError / UndoRejectedError on validation issues.
 */
export async function runUndo(ctx: UndoContext): Promise<UndoResult> {
  const spec = ctx.entry.undoSpec;
  if (!spec) {
    throw new UndoRejectedError("Entry has no undoSpec — it was not flagged as undoable.");
  }
  switch (spec.kind) {
    case "mailbox.add":
      return undoMailboxAdd(ctx, spec.payload);
    default:
      throw new UndoNotSupportedError(spec.kind);
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Per-kind handlers                                                     */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Undo a mailbox creation by deleting the mailbox.
 * Payload: { domain: string, user: string }
 * Safe because: the mailbox was just created — no real customer mail can
 * have arrived in the typical 1-hour TTL window.
 */
async function undoMailboxAdd(
  ctx: UndoContext,
  payload: Record<string, unknown>,
): Promise<UndoResult> {
  const domain = stringField(payload, "domain");
  const user = stringField(payload, "user");
  if (!domain || !user) {
    throw new UndoRejectedError("mailbox.add payload missing domain or user");
  }
  // Cross-check the target on the original entry — defense in depth.
  if (
    ctx.entry.target?.domain &&
    ctx.entry.target.domain.toLowerCase() !== domain.toLowerCase()
  ) {
    throw new UndoRejectedError(
      `Payload domain "${domain}" does not match entry target "${ctx.entry.target.domain}".`,
    );
  }
  await getProvisioner().deleteMailbox(domain, user, ctx.session);
  return {
    ok: true,
    summary: `Deleted mailbox ${user}@${domain} that was created on ${new Date(
      ctx.entry.startedAt,
    ).toLocaleString()}`,
  };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                               */
/* ────────────────────────────────────────────────────────────────────── */

function stringField(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = payload[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Returns true iff the entry can still be undone right now. */
export function isStillUndoable(entry: JournalEntry, now = Date.now()): boolean {
  if (!entry.undoable || !entry.undoSpec) return false;
  if (entry.undoneAt) return false;
  const ttl = entry.undoSpec.ttlMinutes;
  if (ttl && ttl > 0) {
    const ageMs = now - new Date(entry.startedAt).getTime();
    if (ageMs > ttl * 60_000) return false;
  }
  return true;
}
