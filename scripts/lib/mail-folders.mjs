/**
 * Standard IMAP folders for Qadbak webmail (Roundcube-style set).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import {
  discoverMailLayout,
  ensureMaildir,
  resolveMailboxMaildir,
} from "./mail-layout.mjs";
import { doveadmAvailable } from "./doveadm-util.mjs";
import { resolveDomainUser } from "./provisioning-common.mjs";

const exec = promisify(execFile);

/** Display order for webmail sidebar */
export const STANDARD_MAILBOX_FOLDERS = [
  "INBOX",
  "Sent",
  "Drafts",
  "Archive",
  "Junk",
  "Trash",
];

const FOLDER_ALIASES = {
  spam: "Junk",
  junk: "Junk",
  deleted: "Trash",
  trash: "Trash",
  "sent messages": "Sent",
  "sent items": "Sent",
  drafts: "Drafts",
  archive: "Archive",
  inbox: "INBOX",
};

/** Normalize Dovecot / Maildir folder names to our standard set. */
export function canonicalFolderName(name) {
  const raw = String(name || "").trim();
  if (!raw || raw === ".") return "INBOX";
  let f = raw.replace(/^INBOX[./]/i, "").replace(/^\//, "").trim();
  if (!f) return "INBOX";
  const key = f.toLowerCase();
  return FOLDER_ALIASES[key] ?? f;
}

/**
 * Create standard Maildir subfolders and Dovecot mailboxes when missing.
 */
export async function ensureStandardMailboxes({
  authUser = null,
  maildirRoot = null,
  useDoveadm = null,
} = {}) {
  const dove = useDoveadm ?? (await doveadmAvailable());

  if (maildirRoot) {
    await ensureMaildir(maildirRoot);
    for (const name of STANDARD_MAILBOX_FOLDERS) {
      if (name === "INBOX") continue;
      await ensureMaildir(path.join(maildirRoot, name));
    }
  }

  if (dove && authUser) {
    for (const name of STANDARD_MAILBOX_FOLDERS) {
      if (name === "INBOX") continue;
      try {
        await exec("doveadm", ["mailbox", "create", "-u", authUser, name], {
          timeout: 30_000,
        });
      } catch {
        /* already exists or unsupported name — Maildir layout still works */
      }
    }
  }
}

/**
 * Merge listed folders with the standard set (empty folders shown as 0 messages).
 */
export function mergeStandardMailboxes(mailboxes, defaultUser = "") {
  const map = new Map();
  for (const m of mailboxes ?? []) {
    const folder = canonicalFolderName(m.folder);
    const prev = map.get(folder);
    if (!prev) {
      map.set(folder, { ...m, folder });
      continue;
    }
    const a = Number(prev.messages) || 0;
    const b = Number(m.messages) || 0;
    if (b > a) map.set(folder, { ...m, folder });
  }

  const out = [];
  for (const std of STANDARD_MAILBOX_FOLDERS) {
    if (map.has(std)) {
      out.push(map.get(std));
      map.delete(std);
    } else {
      out.push({
        user: defaultUser,
        folder: std,
        messages: "0",
        size: "0 B",
      });
    }
  }
  for (const m of map.values()) {
    out.push(m);
  }
  return out;
}

/** Store a copy of an outgoing message in the Sent folder (best effort). */
export async function saveSentCopy(domain, localUser, rawMessage) {
  try {
    const local = String(localUser || "").trim().toLowerCase();
    if (!local) return;
    const { user: owner, home } = await resolveDomainUser(domain);
    const layout = await discoverMailLayout(domain, owner, home);
    const maildir = await resolveMailboxMaildir(layout, local, owner, home);
    const sentRoot = path.join(maildir, "Sent");
    await ensureMaildir(sentRoot);
    const from = `${local}@${domain}`;

    if (await doveadmAvailable()) {
      const tmp = path.join(
        "/tmp",
        `qadbak-sent-${randomBytes(6).toString("hex")}.eml`,
      );
      await writeFile(tmp, rawMessage);
      try {
        await exec("doveadm", ["save", "-u", from, "-m", "Sent", tmp], {
          timeout: 30_000,
        });
      } finally {
        await unlink(tmp).catch(() => {});
      }
      return;
    }

    const fname = `${Date.now()}.M${process.pid}P${randomBytes(4).toString("hex")}:2,S`;
    await writeFile(path.join(sentRoot, "cur", fname), rawMessage);
  } catch {
    /* optional */
  }
}
