import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  emit,
  fail,
  QADBAK_DIR,
  loadRegistry,
  saveRegistry,
  writeDomainConfigJson,
} from "./provisioning-common.mjs";
import { limitsSet } from "./provision-limits.mjs";

const STORE = path.join(QADBAK_DIR, "data", "native-plans-resellers.json");

export async function loadPlansStore() {
  try {
    const raw = await readFile(STORE, "utf8");
    const o = JSON.parse(raw);
    return {
      resellers: Array.isArray(o.resellers) ? o.resellers : [],
      plans: Array.isArray(o.plans) ? o.plans : [],
    };
  } catch {
    return { resellers: [], plans: [{ name: "Default", disk: "10GB", mailboxes: "25", databases: "5" }] };
  }
}

export async function savePlansStore(data) {
  await mkdir(path.dirname(STORE), { recursive: true });
  await writeFile(STORE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function planLimitsBody(plan) {
  return {
    disk: String(plan.disk ?? plan.quota ?? ""),
    bandwidth: String(plan.bandwidth ?? ""),
    mailboxes: String(plan.mailboxes ?? ""),
    databases: String(plan.databases ?? ""),
  };
}

export async function planGet(name) {
  const n = String(name || "").trim();
  const { plans } = await loadPlansStore();
  const plan = plans.find((p) => p.name === n || p.id === n);
  if (!plan) fail(`Plan not found: ${n}`);
  emit({ ok: true, plan: { name: plan.name, ...planLimitsBody(plan) } });
}

export async function planApplyToDomain(domain, planName) {
  const n = String(planName || "").trim();
  const { plans } = await loadPlansStore();
  const plan = plans.find((p) => p.name === n || p.id === n);
  if (!plan) fail(`Plan not found: ${n}`);
  const limits = planLimitsBody(plan);
  await limitsSet(domain, JSON.stringify(limits));
  const rows = await loadRegistry();
  const idx = rows.findIndex((r) => String(r.name).toLowerCase() === domain.toLowerCase());
  if (idx >= 0) {
    rows[idx].plan = plan.name;
    if (limits.disk) rows[idx].disk_limit = limits.disk;
    await saveRegistry(rows);
  }
  await writeDomainConfigJson(domain, "package.json", {
    plan: plan.name,
    appliedAt: new Date().toISOString(),
    limits,
  });
  emit({ ok: true, domain, plan: plan.name, limits });
}

export async function planUpsert(name, jsonArg) {
  const n = String(name || "").trim();
  if (!n) fail("Plan name required");
  let body = {};
  try {
    body = JSON.parse(jsonArg || "{}");
  } catch {
    fail("invalid plan JSON");
  }
  const store = await loadPlansStore();
  const idx = store.plans.findIndex((p) => p.name === n);
  const row = {
    name: n,
    disk: body.disk ?? body.quota ?? "10GB",
    bandwidth: body.bandwidth ?? "",
    mailboxes: body.mailboxes ?? "25",
    databases: body.databases ?? "5",
  };
  if (idx >= 0) store.plans[idx] = { ...store.plans[idx], ...row };
  else store.plans.push(row);
  await savePlansStore(store);
  emit({ ok: true, plan: row });
}
