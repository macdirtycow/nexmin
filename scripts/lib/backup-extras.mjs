import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { access, mkdir, readdir, writeFile, readFile, cp, rm } from "node:fs/promises";
import { loadRegistry, domainConfigDir } from "./provisioning-common.mjs";
import {
  readMapFile,
  QADBAK_POSTFIX_VIRTUAL,
  QADBAK_POSTFIX_VMAILBOX,
  QADBAK_POSTFIX_VMAILBOX_UID,
  QADBAK_POSTFIX_VMAILBOX_GID,
} from "./mail-layout.mjs";

const exec = promisify(execFile);

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveZonePath(domain) {
  const d = String(domain).toLowerCase();
  const rows = await loadRegistry();
  const hit = rows.find((r) => String(r.name || "").toLowerCase() === d);
  if (hit?.zoneFile && (await fileExists(hit.zoneFile))) return hit.zoneFile;

  const candidates = [
    `/etc/bind/zones/db.${d}`,
    `/var/lib/bind/db.${d}`,
    `/var/lib/bind/${d}.hosts`,
    `/etc/bind/db.${d}`,
    `/etc/bind/zones/${d}`,
  ];
  for (const p of candidates) {
    if (await fileExists(p)) return p;
  }
  return null;
}

function rowsForDomain(rows, domain) {
  const suffix = `@${String(domain).toLowerCase()}`;
  return rows.filter((r) => String(r.address || "").toLowerCase().endsWith(suffix));
}

/** Postfix map lines for this domain (for disaster recovery; live maps rebuilt via mail-sync). */
export async function exportPostfixDomainMaps(domain) {
  const d = String(domain).toLowerCase();
  const virtual = rowsForDomain(await readMapFile(QADBAK_POSTFIX_VIRTUAL), d);
  const vmailbox = rowsForDomain(await readMapFile(QADBAK_POSTFIX_VMAILBOX), d);
  const vuids = rowsForDomain(await readMapFile(QADBAK_POSTFIX_VMAILBOX_UID), d);
  const vgids = rowsForDomain(await readMapFile(QADBAK_POSTFIX_VMAILBOX_GID), d);
  const hasData = virtual.length + vmailbox.length + vuids.length + vgids.length > 0;
  return { domain: d, virtual, vmailbox, vuids, vgids, hasData };
}

export async function listDomainSettingsFiles(domain) {
  const dir = domainConfigDir(domain);
  if (!(await fileExists(dir))) return [];
  const files = [];
  for (const name of await readdir(dir)) {
    if (name.endsWith(".json")) files.push(name);
  }
  return files.sort();
}

/**
 * DNS zone, SSL certs, crontab, postfix snapshot, settings index.
 * @returns {{ components: string[], settingsFiles: string[] }}
 */
export async function backupDomainExtras(domain, user, home, staging) {
  const components = [];
  const settingsFiles = await listDomainSettingsFiles(domain);

  if (settingsFiles.length) {
    await writeFile(
      path.join(staging, "settings-index.json"),
      `${JSON.stringify({ domain, files: settingsFiles }, null, 2)}\n`,
      "utf8",
    );
  }

  const marker = path.join(home, ".qadbak-domain");
  if (await fileExists(marker)) {
    await cp(marker, path.join(staging, ".qadbak-domain"));
  }

  try {
    const { stdout } = await exec("crontab", ["-l", "-u", user], {
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
    if (stdout.trim()) {
      await writeFile(path.join(staging, "crontab.txt"), stdout, "utf8");
      components.push("crontab");
    }
  } catch {
    /* no crontab */
  }

  const zonePath = await resolveZonePath(domain);
  if (zonePath) {
    const dnsDir = path.join(staging, "dns");
    await mkdir(dnsDir, { recursive: true });
    await cp(zonePath, path.join(dnsDir, "zone"));
    await writeFile(
      path.join(dnsDir, "meta.json"),
      `${JSON.stringify({ sourcePath: zonePath, domain }, null, 2)}\n`,
      "utf8",
    );
    components.push("dns");
  }

  const sslRoot = path.join(staging, "ssl");
  const sslHosts = [];
  for (const host of [domain, `www.${domain}`]) {
    const live = path.join("/etc/letsencrypt/live", host);
    if (await fileExists(live)) sslHosts.push(host);
  }
  if (sslHosts.length) {
    await mkdir(sslRoot, { recursive: true });
    for (const host of sslHosts) {
      await exec(
        "cp",
        ["-a", path.join("/etc/letsencrypt/live", host), path.join(sslRoot, host)],
        { timeout: 120_000 },
      );
    }
    components.push(sslHosts.length > 1 ? "ssl (2 hosts)" : "ssl");
  }

  const pf = await exportPostfixDomainMaps(domain);
  if (pf.hasData) {
    await writeFile(
      path.join(staging, "postfix-domain.json"),
      `${JSON.stringify(pf, null, 2)}\n`,
      "utf8",
    );
    components.push("mail-routing");
  }

  return { components, settingsFiles };
}

export async function restoreDomainExtras(domain, user, home, staging, restored) {
  const markerStaging = path.join(staging, ".qadbak-domain");
  if (await fileExists(markerStaging)) {
    await cp(markerStaging, path.join(home, ".qadbak-domain"));
  }

  const cronStaging = path.join(staging, "crontab.txt");
  if (await fileExists(cronStaging)) {
    const body = await readFile(cronStaging, "utf8");
    const tmp = `/tmp/qadbak-restore-cron-${user}-${Date.now()}`;
    await writeFile(tmp, body.endsWith("\n") ? body : `${body}\n`, "utf8");
    try {
      await exec("crontab", ["-u", user, tmp], { timeout: 30_000 });
      restored.push("crontab");
    } catch {
      /* */
    }
  }

  const dnsZone = path.join(staging, "dns", "zone");
  if (await fileExists(dnsZone)) {
    let target = "";
    try {
      const meta = JSON.parse(await readFile(path.join(staging, "dns", "meta.json"), "utf8"));
      target = String(meta.sourcePath || "").trim();
    } catch {
      /* */
    }
    if (!target) target = (await resolveZonePath(domain)) || `/etc/bind/zones/db.${domain}`;
    await mkdir(path.dirname(target), { recursive: true }).catch(() => {});
    await cp(dnsZone, target, { force: true });
    restored.push("dns");
    try {
      await exec("rndc", ["reload"], { timeout: 30_000 });
    } catch {
      try {
        await exec("systemctl", ["reload", "bind9"], { timeout: 30_000 });
      } catch {
        /* */
      }
    }
  }

  const sslStaging = path.join(staging, "ssl");
  if (await fileExists(sslStaging)) {
    for (const host of await readdir(sslStaging)) {
      if (host.startsWith(".")) continue;
      const src = path.join(sslStaging, host);
      const dest = path.join("/etc/letsencrypt/live", host);
      if (!(await fileExists(src))) continue;
      await mkdir(path.dirname(dest), { recursive: true }).catch(() => {});
      await rm(dest, { recursive: true, force: true }).catch(() => {});
      await exec("cp", ["-a", src, dest], { timeout: 120_000 });
    }
    restored.push("ssl");
  }

  const hadMail =
    restored.some((r) => String(r).startsWith("mail")) ||
    (await fileExists(path.join(staging, "mail"))) ||
    (await fileExists(path.join(staging, "Maildir")));
  const hadConfig = await fileExists(path.join(staging, "qadbak-config"));

  if (hadMail || hadConfig || (await fileExists(path.join(staging, "postfix-domain.json")))) {
    try {
      const { rebuildPostfixMailboxMaps, postmapReloadAll } = await import("./mail-sync.mjs");
      await rebuildPostfixMailboxMaps();
      await postmapReloadAll();
      restored.push("mail-routing");
    } catch {
      /* mail stack optional */
    }
  }
}
