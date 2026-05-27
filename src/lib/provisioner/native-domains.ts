import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Role } from "../types";
import type { HostedDomain } from "../types";

const execFileAsync = promisify(execFile);

export type NativeDomainRecord = {
  name: string;
  user: string;
  disabled?: boolean;
  plan?: string;
  disk_limit?: string;
};

const REGISTRY = path.join(process.cwd(), "data", "native-domains.json");

export async function loadNativeDomainRegistry(): Promise<NativeDomainRecord[]> {
  try {
    const raw = await fs.readFile(REGISTRY, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: NativeDomainRecord[] = [];
    for (const row of parsed) {
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? "").trim();
      const user = String(r.user ?? name.split(".")[0] ?? "").trim();
      if (!name || !user) continue;
      out.push({
        name,
        user,
        disabled: Boolean(r.disabled),
        plan: String(r.plan ?? "Default"),
        disk_limit: r.disk_limit ? String(r.disk_limit) : undefined,
      });
    }
    return out;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw e;
  }
}

/** Fallback when registry empty: unix users under /home with public_html. */
export async function scanHomeDomains(): Promise<NativeDomainRecord[]> {
  const home = "/home";
  let entries: string[] = [];
  try {
    entries = await fs.readdir(home);
  } catch {
    return [];
  }
  const out: NativeDomainRecord[] = [];
  for (const user of entries) {
    if (user === "." || user === ".." || user === "qadbak") continue;
    const pub = path.join(home, user, "public_html");
    try {
      const st = await fs.stat(pub);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }
    const hint = path.join(home, user, ".qadbak-domain");
    let name = "";
    try {
      name = (await fs.readFile(hint, "utf8")).trim().split("\n")[0]?.trim() ?? "";
    } catch {
      /* no hint file */
    }
    if (!name.includes(".")) continue;
    out.push({ name, user, plan: "Default" });
  }
  return out;
}

async function diskLimitForDomain(domainName: string): Promise<string | undefined> {
  const cfgPath = path.join(
    process.cwd(),
    "data",
    "domain-config",
    domainName.toLowerCase(),
    "limits.json",
  );
  try {
    const raw = await fs.readFile(cfgPath, "utf8");
    const cfg = JSON.parse(raw) as { disk?: string };
    if (cfg.disk?.trim()) return cfg.disk.trim();
  } catch {
    /* */
  }
  return undefined;
}

async function homeDiskUsedMb(unixUser: string): Promise<string> {
  const user = unixUser.trim();
  if (!user) return "0";
  try {
    const { stdout } = await execFileAsync("du", ["-sm", `/home/${user}`], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const mb = stdout.split("\t")[0]?.trim();
    return mb && /^\d+(\.\d+)?$/.test(mb) ? mb : "0";
  } catch {
    return "0";
  }
}

async function enrichDomainDisk(row: NativeDomainRecord): Promise<HostedDomain> {
  const used = await homeDiskUsedMb(row.user);
  const limit =
    (await diskLimitForDomain(row.name)) ?? row.disk_limit?.trim() ?? undefined;
  return {
    name: row.name,
    disabled: row.disabled ? "1" : "0",
    plan: row.plan ?? "Default",
    user: row.user,
    disk_used: used,
    disk_limit: limit,
  };
}

export async function listDomainsNative(actor: {
  role: Role;
  domains: string[];
}): Promise<HostedDomain[]> {
  let rows = await loadNativeDomainRegistry();
  if (rows.length === 0) rows = await scanHomeDomains();

  let mapped = await Promise.all(rows.map((r) => enrichDomainDisk(r)));

  if (actor.role === "client") {
    const allowed = new Set(actor.domains.map((d) => d.toLowerCase()));
    mapped = mapped.filter((d) => allowed.has(d.name.toLowerCase()));
  }
  return mapped;
}

export async function findDomainByNameNative(
  domainName: string,
  actor: { role: Role; domains: string[] },
): Promise<HostedDomain | undefined> {
  const want = domainName.trim().toLowerCase();
  const domains = await listDomainsNative(actor);
  return domains.find((d) => d.name.toLowerCase() === want);
}

/** Same convention as legacy hosting API — first label of domain, sanitized. */
export function defaultDomainUnixUser(domain: string): string {
  const base = domain.split(".")[0] ?? "site";
  const safe = base.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return (safe || "site").slice(0, 32);
}

/** Unix user for domain shell / terminal (registry or home scan — no legacy hosting API API). */
export async function resolveDomainUnixUserNative(
  domain: string,
  actor: { role: Role; domains: string[] },
): Promise<string> {
  const hit = await findDomainByNameNative(domain, actor);
  if (hit?.user) return hit.user;
  return defaultDomainUnixUser(domain);
}
