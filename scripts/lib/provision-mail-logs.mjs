import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { emit, resolveDomainUser } from "./provisioning-common.mjs";

const exec = promisify(execFile);

const LOG_CANDIDATES = [
  "/var/log/mail.log",
  "/var/log/maillog",
  "/var/log/mail/mail.log",
  "/var/log/syslog",
];

async function canRead(path) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function readTail(path, lines = 80) {
  try {
    const { stdout } = await exec("tail", ["-n", String(lines), path], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 15_000,
    });
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

async function grepFile(path, needle) {
  try {
    const { stdout } = await exec(
      "grep",
      ["-i", "-F", "--", needle, path],
      { maxBuffer: 4 * 1024 * 1024, timeout: 20_000 },
    );
    return stdout.split("\n").filter(Boolean);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === 1) {
      return [];
    }
    return null;
  }
}

/** Recent Postfix/Dovecot lines from journald (Ubuntu/Debian). */
async function journalMailLines(domain, max = 120) {
  const d = domain.toLowerCase();
  const attempts = [
    [
      "journalctl",
      [
        "-u",
        "postfix@-",
        "-u",
        "postfix",
        "-u",
        "dovecot",
        "--no-pager",
        "-n",
        String(max),
        "-o",
        "short-iso",
      ],
    ],
    [
      "journalctl",
      ["--no-pager", "-n", String(max * 2), "-o", "short-iso"],
    ],
  ];
  for (const args of attempts) {
    try {
      const { stdout } = await exec(args[0], args[1], {
        maxBuffer: 4 * 1024 * 1024,
        timeout: 25_000,
      });
      const lines = stdout
        .split("\n")
        .filter((line) => line.trim())
        .filter(
          (line) =>
            line.toLowerCase().includes(d) ||
            /postfix|dovecot|lmtp|smtp|postfix\/smtp/i.test(line),
        );
      if (lines.length) return lines.slice(-max);
    } catch {
      /* try next */
    }
  }
  return [];
}

export async function mailLogsSearch(domain, query) {
  await resolveDomainUser(domain);
  const d = String(domain || "").trim().toLowerCase();
  const q = String(query || "").trim();
  const needle = q || d;
  const collected = [];

  const journal = await journalMailLines(d, 100);
  collected.push(...journal);

  for (const logPath of LOG_CANDIDATES) {
    if (!(await canRead(logPath))) continue;
    const matched = await grepFile(logPath, needle);
    if (matched?.length) {
      collected.push(...matched);
      continue;
    }
    if (!q) {
      const tail = await readTail(logPath, 80);
      for (const line of tail) {
        if (line.toLowerCase().includes(d)) collected.push(line);
      }
    }
  }

  let lines = [...new Set(collected)].slice(-100);
  if (!lines.length) {
    for (const logPath of LOG_CANDIDATES) {
      if (!(await canRead(logPath))) continue;
      lines = (await readTail(logPath, 40)).slice(-40);
      if (lines.length) break;
    }
  }

  emit({
    ok: true,
    lines,
    source: lines.length ? "postfix-dovecot-logs" : "empty",
    hint: lines.length
      ? undefined
      : "No mail log lines found. Check /var/log/mail.log and journalctl -u postfix on the server.",
  });
}
