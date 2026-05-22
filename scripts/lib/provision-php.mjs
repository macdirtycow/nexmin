import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  emit,
  resolveDomainUser,
  readDomainConfigJson,
  writeDomainConfigJson,
  fileExists,
} from "./provisioning-common.mjs";

const exec = promisify(execFile);

export async function phpVersions(domain) {
  await resolveDomainUser(domain);
  const versions = [];
  try {
    const dirs = await readdir("/etc/php");
    for (const d of dirs) {
      if (/^\d/.test(d)) versions.push({ version: d.replace(/^php/, "") || d, id: d });
    }
  } catch {
    /* */
  }
  if (!versions.length) {
    try {
      const { stdout } = await exec("php", ["-v"], { timeout: 10_000 });
      const m = stdout.match(/PHP (\d+\.\d+)/);
      if (m) versions.push({ version: m[1], id: m[1] });
    } catch {
      versions.push({ version: "8.2", id: "8.2" });
    }
  }
  emit({ ok: true, versions, source: "native-php" });
}

export async function phpDirectories(domain) {
  const { home } = await resolveDomainUser(domain);
  const cfg = await readDomainConfigJson(domain, "php.json", {});
  const version = cfg.defaultVersion || "8.2";
  const directories = [{ dir: "public_html", version, mode: "cgi" }];
  if (await fileExists(path.join(home, "public_html"))) {
    emit({ ok: true, directories, source: "native-php" });
    return;
  }
  emit({ ok: true, directories, source: "native-php" });
}

export async function phpIni(domain, version) {
  await resolveDomainUser(domain);
  const ver = version || (await readDomainConfigJson(domain, "php.json", {})).defaultVersion || "8.2";
  const iniPath = `/etc/php/${ver}/fpm/php.ini`;
  const settings = [];
  try {
    const text = await readFile(iniPath, "utf8");
    for (const key of ["memory_limit", "upload_max_filesize", "post_max_size", "max_execution_time"]) {
      const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, "m"));
      if (m) settings.push({ name: key, value: m[1].trim() });
    }
  } catch {
    /* */
  }
  emit({ ok: true, ini: settings, version: ver, source: "native-php" });
}

export async function phpSetDirectory(domain, dir, version) {
  await resolveDomainUser(domain);
  await writeDomainConfigJson(domain, "php.json", {
    defaultVersion: version,
    directory: dir,
  });
  emit({ ok: true });
}
