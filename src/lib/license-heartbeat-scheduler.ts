import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * In-process heartbeat scheduler.
 *
 * Premium licenses are validated against the license server, not against
 * the local cache. To keep that validation fresh — and to detect
 * revocations within a bounded window — every running panel performs a
 * background heartbeat at a fixed interval.
 *
 * Frequency: defaults to every 6 hours, configurable via
 * $QADBAK_HEARTBEAT_INTERVAL_HOURS. Combined with the 48h freshness
 * grace window, the panel tolerates ~8 missed heartbeats before
 * downgrading itself to Core.
 *
 * Process model: the scheduler is registered from `instrumentation.ts`,
 * which Next.js calls exactly once on server startup (per Node process).
 * Under pm2 cluster this means one scheduler per worker — that's fine,
 * because the heartbeat endpoint is idempotent and rate-limited
 * server-side.
 *
 * Operators who want to disable the scheduler (e.g. for tests, or when
 * running the panel as a one-shot CLI process) can set
 * $QADBAK_DISABLE_HEARTBEAT_SCHEDULER=true.
 */

declare global {
  var __qadbakHeartbeatTimer: NodeJS.Timeout | undefined;
  var __qadbakHeartbeatStartedAt: number | undefined;
}

function intervalMs(): number {
  const env = process.env.QADBAK_HEARTBEAT_INTERVAL_HOURS?.trim();
  const hours = env ? Number(env) : 6;
  if (!Number.isFinite(hours) || hours <= 0) return 6 * 60 * 60 * 1000;
  return hours * 60 * 60 * 1000;
}

function hasStoredLicense(): boolean {
  const licensePath = path.join(process.cwd(), "data", "license.json");
  return existsSync(licensePath);
}

async function runHeartbeatOnce(): Promise<void> {
  if (!hasStoredLicense()) return; // no Premium → nothing to refresh
  try {
    const { heartbeatLicense } = await import("./qadbak-license");
    const result = await heartbeatLicense();
    if (!result) {
      // License was revoked server-side and cleared locally.
      console.warn(
        "[license-heartbeat] license revoked by license server; cleared local cache",
      );
      return;
    }
    if (process.env.QADBAK_DEBUG_HEARTBEAT === "true") {
      console.log(
        `[license-heartbeat] ok — status=${result.status} features=${result.features.length}`,
      );
    }
  } catch (e) {
    // Heartbeat failures are non-fatal — the next scheduled tick will
    // retry, and isPremiumActive falls back to the freshness grace
    // window so a few missed heartbeats don't lock customers out.
    console.warn(
      `[license-heartbeat] failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export function startHeartbeatScheduler(): void {
  if (process.env.QADBAK_DISABLE_HEARTBEAT_SCHEDULER === "true") return;
  if (globalThis.__qadbakHeartbeatTimer) return; // already running
  globalThis.__qadbakHeartbeatStartedAt = Date.now();
  // First run after a short grace so the rest of the app finishes
  // booting before we touch the network.
  setTimeout(runHeartbeatOnce, 10_000).unref();
  const timer = setInterval(runHeartbeatOnce, intervalMs());
  timer.unref(); // do not keep the event loop alive solely for this
  globalThis.__qadbakHeartbeatTimer = timer;
  console.log(
    `[license-heartbeat] scheduler started (every ${intervalMs() / (60 * 60 * 1000)}h)`,
  );
}
