import { execFile } from "child_process";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { getHostMetrics } from "./host-metrics";
import { loadAlertSettings } from "./alert-rules";
import { runProvisioningHelper } from "./provisioner/native-exec";
import { nativeFeatureEnabled } from "./provisioner/native-features";

const execFileAsync = promisify(execFile);

async function sendEmail(to: string, subject: string, body: string) {
  if (!to.trim()) return;
  await execFileAsync(
    "bash",
    ["-c", `printf %s ${JSON.stringify(body)} | mail -s ${JSON.stringify(subject)} ${JSON.stringify(to)}`],
    { timeout: 30_000 },
  );
}

async function sendWebhook(url: string, payload: object) {
  if (!url.trim()) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function evaluateAlerts(): Promise<{ fired: string[] }> {
  const settings = await loadAlertSettings();
  const fired: string[] = [];
  let metrics;
  try {
    metrics = await getHostMetrics();
  } catch {
    return { fired };
  }
  const rootDisk = metrics.disks.find((d) => d.mount === "/");
  for (const rule of settings.rules) {
    if (!rule.enabled) continue;
    let hit = false;
    let msg = "";
    if (rule.metric === "disk" && rootDisk) {
      hit = rootDisk.usePct >= rule.threshold;
      msg = `Disk / at ${rootDisk.usePct}% (threshold ${rule.threshold}%)`;
    } else if (rule.metric === "memory") {
      hit = metrics.memory.usePct >= rule.threshold;
      msg = `Memory ${metrics.memory.usePct}% (threshold ${rule.threshold}%)`;
    } else if (rule.metric === "load") {
      hit = metrics.loadAvg[0] >= rule.threshold;
      msg = `Load ${metrics.loadAvg[0]} (threshold ${rule.threshold})`;
    } else if (rule.metric === "ssl_expiry") {
      const days = await minSslDaysLeft();
      if (days !== null) {
        hit = days <= rule.threshold;
        msg = `SSL expires in ${days} day(s) (threshold ${rule.threshold})`;
      }
    } else if (rule.metric === "backup_age" && nativeFeatureEnabled("backup")) {
      const age = await maxBackupAgeDays();
      if (age !== null) {
        hit = age >= rule.threshold;
        msg = `Oldest recent backup is ${age} day(s) old (threshold ${rule.threshold})`;
      }
    }
    if (!hit) continue;
    fired.push(`${rule.id}: ${msg}`);
    const subject = `[Qadbak] Alert: ${rule.id}`;
    if (rule.channel === "email") {
      const to = rule.target || settings.emailTo || "";
      await sendEmail(to, subject, msg).catch(() => {});
    } else if (rule.channel === "slack" && settings.slackWebhook) {
      await sendWebhook(settings.slackWebhook, { text: msg }).catch(() => {});
    } else if (rule.channel === "telegram" && settings.telegramWebhook) {
      await sendWebhook(settings.telegramWebhook, { text: msg }).catch(() => {});
    }
  }
  return { fired };
}

async function minSslDaysLeft(): Promise<number | null> {
  try {
    const domainsDir = path.join(process.cwd(), "data", "domains");
    const names = await readdir(domainsDir).catch(() => []);
    let min: number | null = null;
    for (const d of names) {
      try {
        const certs = await runProvisioningHelper("ssl-list", d);
        for (const c of (certs.certs as { expiry?: string }[]) ?? []) {
          if (!c.expiry) continue;
          const days = Math.ceil(
            (new Date(c.expiry).getTime() - Date.now()) / 86_400_000,
          );
          if (min === null || days < min) min = days;
        }
      } catch {
        /* skip domain */
      }
    }
    return min;
  } catch {
    return null;
  }
}

async function maxBackupAgeDays(): Promise<number | null> {
  try {
    const reg = await readFile(
      path.join(process.cwd(), "data", "native-domains.json"),
      "utf8",
    ).catch(() => "[]");
    const domains = JSON.parse(reg) as { name: string }[];
    let maxAge = 0;
    let any = false;
    for (const { name } of domains) {
      try {
        const bl = await runProvisioningHelper("backup-list", name);
        const files = (bl.backups as { modified?: string }[]) ?? [];
        if (!files.length) continue;
        const newest = files.sort((a, b) =>
          String(b.modified).localeCompare(String(a.modified)),
        )[0];
        const age = Math.floor(
          (Date.now() - new Date(String(newest.modified)).getTime()) / 86_400_000,
        );
        if (age > maxAge) maxAge = age;
        any = true;
      } catch {
        /* skip */
      }
    }
    return any ? maxAge : null;
  } catch {
    return null;
  }
}
