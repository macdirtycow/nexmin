import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import {
  access,
  readdir,
  stat,
  mkdir,
  rm,
  writeFile,
  readFile,
  cp,
  rename,
  realpath,
  open,
} from "node:fs/promises";
import path from "node:path";
import {
  emit,
  fail,
  resolveDomainUser,
  domainConfigDir,
  QADBAK_DIR,
  readDomainConfigJson,
  writeDomainConfigJson,
} from "./provisioning-common.mjs";

const exec = promisify(execFile);
const BACKUP_CFG = "backups.json";
const CRON_MARKER = "qadbak-backup";
const RUN_BACKUP = path.join(QADBAK_DIR, "scripts", "run-domain-backup.sh");

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function mysqlExec(sql) {
  const { stdout } = await exec("mysql", ["-N", "-B", "-e", sql], {
    maxBuffer: 8 * 1024 * 1024,
    timeout: 120_000,
  });
  return stdout.trim();
}

async function listDomainDatabases(domain, unixUser) {
  const prefix = `${unixUser}_`;
  const out = await mysqlExec("SHOW DATABASES");
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((name) => name && (name.startsWith(prefix) || name === unixUser.replace(/-/g, "_")));
}

function safeBackupName(name) {
  const base = path.basename(String(name || ""));
  if (!base || base.includes("..") || !base.endsWith(".tar.gz")) {
    fail("Invalid backup file name");
  }
  return base;
}

function backupsDir(home) {
  return path.join(home, "backups");
}

async function loadSchedule(domain) {
  const cfg = await readDomainConfigJson(domain, BACKUP_CFG, {
    schedule: "0 3 * * *",
    enabled: false,
    retain: 7,
  });
  return {
    schedule: String(cfg.schedule || "0 3 * * *"),
    enabled: Boolean(cfg.enabled),
    retain: Number(cfg.retain) > 0 ? Number(cfg.retain) : 7,
  };
}

async function saveSchedule(domain, schedule) {
  await writeDomainConfigJson(domain, BACKUP_CFG, schedule);
}

async function readCrontab(user) {
  try {
    const { stdout } = await exec("crontab", ["-l", "-u", user], { maxBuffer: 1024 * 1024 });
    return stdout;
  } catch (e) {
    if (String(e).includes("no crontab")) return "";
    throw e;
  }
}

async function writeCrontab(user, body) {
  const tmp = `/tmp/qadbak-cron-${user}-${Date.now()}`;
  await writeFile(tmp, body, "utf8");
  await exec("crontab", ["-u", user, tmp]);
}

function stripBackupCronLines(text) {
  return text
    .split("\n")
    .filter((line) => !line.includes(CRON_MARKER))
    .join("\n")
    .replace(/\n+$/, "");
}

async function syncBackupCron(domain) {
  const { user } = await resolveDomainUser(domain);
  const sched = await loadSchedule(domain);
  let body = stripBackupCronLines(await readCrontab(user));
  if (sched.enabled) {
    const line = `${sched.schedule} ${RUN_BACKUP} ${domain} scheduled # ${CRON_MARKER}`;
    body = body ? `${body}\n${line}\n` : `${line}\n`;
  }
  if (!body.trim()) {
    try {
      await exec("crontab", ["-r", "-u", user]);
    } catch {
      /* no crontab */
    }
  } else {
    await writeCrontab(user, body);
  }
}

async function pruneOldBackups(home, retain) {
  const dir = backupsDir(home);
  const files = [];
  try {
    for (const name of await readdir(dir)) {
      if (!name.endsWith(".tar.gz")) continue;
      const full = path.join(dir, name);
      const st = await stat(full);
      files.push({ name, mtime: st.mtimeMs });
    }
  } catch {
    return;
  }
  files.sort((a, b) => b.mtime - a.mtime);
  for (const f of files.slice(retain)) {
    await rm(path.join(dir, f.name), { force: true });
  }
}

export async function backupList(domain) {
  const { home } = await resolveDomainUser(domain);
  const dir = backupsDir(home);
  await mkdir(dir, { recursive: true });
  const files = [];
  for (const name of await readdir(dir).catch(() => [])) {
    if (!name.endsWith(".tar.gz")) continue;
    const full = path.join(dir, name);
    const st = await stat(full);
    files.push({
      name,
      sizeBytes: st.size,
      modified: st.mtime.toISOString(),
      kind: name.includes("-scheduled-") ? "scheduled" : "manual",
    });
  }
  files.sort((a, b) => b.modified.localeCompare(a.modified));
  const sched = await loadSchedule(domain);
  emit({ ok: true, backups: files, schedule: sched });
}

export async function backupCreate(domain, scopeArg) {
  const scope = String(scopeArg || "full").toLowerCase();
  const { user, home } = await resolveDomainUser(domain);
  const dir = backupsDir(home);
  await mkdir(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const kind = scope === "scheduled" ? "scheduled" : "manual";
  const archive = `${domain}-${kind}-${stamp}.tar.gz`;
  const file = path.join(dir, archive);
  const staging = `/tmp/qadbak-backup-${user}-${Date.now()}`;
  await mkdir(staging, { recursive: true });

  const components = [];
  const pub = path.join(home, "public_html");
  if (await fileExists(pub)) {
    await mkdir(path.join(staging, "public_html"), { recursive: true });
    await exec("cp", ["-a", `${pub}/.`, path.join(staging, "public_html")], {
      timeout: 600_000,
    });
    components.push("public_html");
  }

  const maildir = path.join(home, "Maildir");
  if (scope === "full" && (await fileExists(maildir))) {
    await exec("cp", ["-a", maildir, path.join(staging, "Maildir")], {
      timeout: 600_000,
    });
    components.push("mail");
  }

  const cfgDir = domainConfigDir(domain);
  if (scope === "full" && (await fileExists(cfgDir))) {
    await exec("cp", ["-a", cfgDir, path.join(staging, "qadbak-config")], {
      timeout: 120_000,
    });
    components.push("qadbak-config");
  }

  const mysqlDir = path.join(staging, "mysql");
  if (scope === "full") {
    try {
      const dbs = await listDomainDatabases(domain, user);
      if (dbs.length) {
        await mkdir(mysqlDir, { recursive: true });
        for (const db of dbs) {
          const outSql = path.join(mysqlDir, `${db}.sql`);
          await exec(
            "mysqldump",
            ["--single-transaction", "--quick", db],
            { timeout: 600_000, maxBuffer: 32 * 1024 * 1024 },
          ).then(async ({ stdout }) => {
            await writeFile(outSql, stdout, "utf8");
          });
        }
        components.push("mysql");
      }
    } catch {
      /* mysqldump optional */
    }
  }

  const manifest = {
    version: 1,
    domain,
    created: new Date().toISOString(),
    scope,
    components,
  };
  await writeFile(
    path.join(staging, "qadbak-backup-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  await exec("tar", ["-czf", file, "-C", staging, "."], {
    timeout: 900_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  await exec("chown", [`${user}:${user}`, file]);
  await rm(staging, { recursive: true, force: true });

  const sched = await loadSchedule(domain);
  await pruneOldBackups(home, sched.retain);

  emit({
    ok: true,
    file: archive,
    path: file,
    sizeBytes: (await stat(file)).size,
    components,
  });
}

export async function backupDelete(domain, name) {
  const fname = safeBackupName(name);
  const { user, home } = await resolveDomainUser(domain);
  const full = path.join(backupsDir(home), fname);
  if (!(await fileExists(full))) fail(`Backup not found: ${fname}`);
  await rm(full);
  emit({ ok: true, deleted: fname });
}

async function assertPanelUploadTemp(tempPath) {
  const tmpRoot = await realpath(os.tmpdir());
  const resolved = await realpath(tempPath).catch(() => null);
  if (!resolved || !resolved.startsWith(`${tmpRoot}${path.sep}`)) {
    fail("Invalid temp path");
  }
  const base = path.basename(resolved);
  if (!base.startsWith("qadbak-upload-")) {
    fail("Invalid temp file");
  }
  const st = await stat(resolved);
  if (!st.isFile()) fail("Not a file");
  return { resolved, sizeBytes: st.size };
}

async function assertGzipArchive(filePath) {
  const buf = Buffer.alloc(2);
  const fh = await open(filePath, "r");
  try {
    await fh.read(buf, 0, 2, 0);
  } finally {
    await fh.close();
  }
  if (buf[0] !== 0x1f || buf[1] !== 0x8b) {
    fail("File must be a .tar.gz gzip archive");
  }
}

/** Import a backup archive uploaded via the panel (temp file under os.tmpdir()). */
export async function backupUpload(domain, tempPath, destNameArg) {
  const { user, home } = await resolveDomainUser(domain);
  const { resolved, sizeBytes } = await assertPanelUploadTemp(tempPath);
  await assertGzipArchive(resolved);

  const dir = backupsDir(home);
  await mkdir(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let fname = destNameArg?.trim()
    ? safeBackupName(destNameArg.trim())
    : `${domain}-uploaded-${stamp}.tar.gz`;
  const dest = path.join(dir, fname);
  if (await fileExists(dest)) {
    fname = `${domain}-uploaded-${stamp}.tar.gz`;
  }
  const finalPath = path.join(dir, fname);

  await rename(resolved, finalPath);
  await exec("chown", [`${user}:${user}`, finalPath]);

  const sched = await loadSchedule(domain);
  await pruneOldBackups(home, sched.retain);

  emit({
    ok: true,
    file: fname,
    path: finalPath,
    sizeBytes: (await stat(finalPath)).size,
    uploadedBytes: sizeBytes,
  });
}

/** Resolve absolute path + size for panel download (path stays server-side until streamed). */
export async function backupResolveDownload(domain, name) {
  const fname = safeBackupName(name);
  const { home } = await resolveDomainUser(domain);
  const dir = path.resolve(backupsDir(home));
  const full = path.resolve(path.join(dir, fname));
  if (!full.startsWith(`${dir}${path.sep}`)) fail("Invalid backup path");
  if (!(await fileExists(full))) fail(`Backup not found: ${fname}`);
  const st = await stat(full);
  if (!st.isFile()) fail("Not a backup file");
  emit({ ok: true, path: full, fileName: fname, sizeBytes: st.size });
}

export async function backupRestore(domain, source, testOnly) {
  const d = String(domain).trim().toLowerCase();
  const { user, home } = await resolveDomainUser(d);
  let archive = String(source || "").trim();
  if (!archive) fail("source required");
  if (!archive.includes("/")) {
    archive = path.join(backupsDir(home), safeBackupName(archive));
  } else if (!archive.startsWith(backupsDir(home))) {
    fail("Restore source must be under domain backups directory");
  }
  if (!(await fileExists(archive))) fail(`Archive not found: ${archive}`);

  if (testOnly === "true" || testOnly === true || testOnly === "1") {
    const { stdout } = await exec("tar", ["-tzf", archive], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const lines = stdout.split("\n").filter(Boolean).slice(0, 200);
    emit({ ok: true, test: true, entries: lines.length, preview: lines.slice(0, 30) });
    return;
  }

  const staging = `/tmp/qadbak-restore-${user}-${Date.now()}`;
  await mkdir(staging, { recursive: true });
  await exec("tar", ["-xzf", archive, "-C", staging], { timeout: 900_000 });

  const restored = [];
  const pubStaging = path.join(staging, "public_html");
  const pub = path.join(home, "public_html");
  if (await fileExists(pubStaging)) {
    await mkdir(pub, { recursive: true });
    await exec("rsync", ["-a", "--delete", `${pubStaging}/`, `${pub}/`], {
      timeout: 600_000,
    });
    restored.push("public_html");
  }

  const mailStaging = path.join(staging, "Maildir");
  if (await fileExists(mailStaging)) {
    const maildir = path.join(home, "Maildir");
    await rm(maildir, { recursive: true, force: true }).catch(() => {});
    await cp(mailStaging, maildir, { recursive: true });
    await exec("chown", ["-R", `${user}:${user}`, maildir]);
    restored.push("mail");
  }

  const cfgStaging = path.join(staging, "qadbak-config");
  if (await fileExists(cfgStaging)) {
    const target = domainConfigDir(d);
    await rm(target, { recursive: true, force: true }).catch(() => {});
    await cp(cfgStaging, target, { recursive: true });
    restored.push("qadbak-config");
  }

  const mysqlStaging = path.join(staging, "mysql");
  if (await fileExists(mysqlStaging)) {
    for (const name of await readdir(mysqlStaging)) {
      if (!name.endsWith(".sql")) continue;
      const db = name.replace(/\.sql$/, "");
      const sqlPath = path.join(mysqlStaging, name);
      await exec(
        "bash",
        ["-c", `mysql ${db.replace(/[^a-zA-Z0-9_]/g, "")} < ${JSON.stringify(sqlPath)}`],
        { timeout: 600_000, maxBuffer: 32 * 1024 * 1024 },
      ).catch(() => {});
    }
    restored.push("mysql");
  }

  await rm(staging, { recursive: true, force: true });
  await exec("chown", ["-R", `${user}:${user}`, home], { timeout: 120_000 }).catch(() => {});
  emit({ ok: true, restored, archive: path.basename(archive) });
}

export async function backupScheduleGet(domain) {
  const sched = await loadSchedule(domain);
  emit({ ok: true, schedule: sched });
}

export async function backupScheduleSet(domain, jsonArg) {
  let body = {};
  try {
    body = JSON.parse(jsonArg || "{}");
  } catch {
    fail("invalid schedule JSON");
  }
  const prev = await loadSchedule(domain);
  const next = {
    schedule: String(body.schedule ?? prev.schedule),
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : prev.enabled,
    retain: body.retain !== undefined ? Number(body.retain) : prev.retain,
  };
  await saveSchedule(domain, next);
  await syncBackupCron(domain);
  emit({ ok: true, schedule: next });
}

export async function backupScheduleToggle(domain, enabled) {
  const sched = await loadSchedule(domain);
  sched.enabled = enabled === "true" || enabled === "1" || enabled === true;
  await saveSchedule(domain, sched);
  await syncBackupCron(domain);
  emit({ ok: true, schedule: sched });
}
