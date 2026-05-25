/**
 * Run all health checks in parallel and aggregate the result.
 */

import { sanitize } from "@/lib/journal/sanitize";
import type {
  HealthCheck,
  HealthCheckResult,
  HealthFinding,
  HealthReport,
  HealthSeverity,
} from "./types";

const SEVERITY_ORDER: Record<HealthSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const DEFAULT_TIMEOUT = 5_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let to: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        to = setTimeout(() => reject(new Error(`Check timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (to) clearTimeout(to);
  }
}

async function runOne(check: HealthCheck): Promise<HealthCheckResult> {
  const t0 = Date.now();
  try {
    const findings = await withTimeout(check.run(), check.timeoutMs ?? DEFAULT_TIMEOUT);
    return {
      checkId: check.id,
      durationMs: Date.now() - t0,
      ok: true,
      findings,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      checkId: check.id,
      durationMs: Date.now() - t0,
      ok: false,
      error: sanitize(msg),
      findings: [],
    };
  }
}

/** Run every supplied check in parallel and produce an aggregated report. */
export async function runHealthChecks(checks: HealthCheck[]): Promise<HealthReport> {
  const t0 = Date.now();
  const results = await Promise.all(checks.map(runOne));
  const flat: HealthFinding[] = [];
  for (const r of results) flat.push(...r.findings);
  flat.sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });
  const counts = {
    info: flat.filter((f) => f.severity === "info").length,
    warning: flat.filter((f) => f.severity === "warning").length,
    critical: flat.filter((f) => f.severity === "critical").length,
    total: flat.length,
  };
  return {
    generatedAt: new Date().toISOString(),
    totalMs: Date.now() - t0,
    checks: results,
    findings: flat,
    counts,
  };
}
