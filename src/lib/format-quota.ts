import type { HostedMailbox } from "@/lib/types";

/** Mailbox Maildir usage shown in the accounts table (MB). */
export function formatMailboxUsedMb(mailbox: HostedMailbox): string {
  const raw =
    (mailbox as HostedMailbox & { quotaUsedMb?: string }).quotaUsedMb ??
    mailbox.quota ??
    mailbox["values.quota"];
  const s = String(raw ?? "").trim();
  return s || "0";
}

/** Domain disk card: used / limit in MB. */
export function formatDomainDisk(
  used?: string,
  limit?: string,
): string {
  const u = String(used ?? "").trim() || "0";
  const l = String(limit ?? "").trim();
  return l ? `${u} / ${l}` : u;
}
