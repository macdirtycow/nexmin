import {
  emit,
  resolveDomainUser,
  loadRegistry,
  saveRegistry,
  readDomainConfigJson,
  writeDomainConfigJson,
} from "./provisioning-common.mjs";

export async function limitsGet(domain) {
  await resolveDomainUser(domain);
  const limits = await readDomainConfigJson(domain, "limits.json", {});
  const rows = await loadRegistry();
  const hit = rows.find((r) => String(r.name).toLowerCase() === domain.toLowerCase());
  emit({
    ok: true,
    limits: {
      disk: limits.disk ?? hit?.disk_limit ?? "",
      bandwidth: limits.bandwidth ?? "",
      mailboxes: limits.mailboxes ?? "",
      databases: limits.databases ?? "",
    },
    source: "qadbak-domain-config",
  });
}

export async function limitsSet(domain, limitsJson) {
  const d = String(domain).toLowerCase();
  let limits = limitsJson;
  if (typeof limitsJson === "string") {
    try {
      limits = JSON.parse(limitsJson);
    } catch {
      limits = {};
    }
  }
  await writeDomainConfigJson(d, "limits.json", limits);
  const rows = await loadRegistry();
  const idx = rows.findIndex((r) => String(r.name).toLowerCase() === d);
  if (idx >= 0) {
    if (limits.disk) rows[idx].disk_limit = limits.disk;
    await saveRegistry(rows);
  }
  emit({ ok: true });
}
