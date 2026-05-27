import { resolveMailboxMaildir } from "./mail-layout.mjs";
import { kbToDisplayMb, pathSizeKb } from "./disk-usage.mjs";

/** Add Maildir usage (MB) per mailbox for the panel list. */
export async function enrichMailboxesWithUsage(layout, mailboxes) {
  const owner = layout.owner;
  const home = layout.home;
  const out = [];

  for (const m of mailboxes) {
    const local = String(m.user || m.name || "").trim().toLowerCase();
    let usedMb = "0";
    if (local) {
      try {
        const maildir = await resolveMailboxMaildir(layout, local, owner, home);
        const kb = await pathSizeKb(maildir);
        usedMb = kbToDisplayMb(kb);
      } catch {
        usedMb = "0";
      }
    }
    out.push({
      ...m,
      quotaUsedMb: usedMb,
      quota: usedMb,
    });
  }

  return out;
}
