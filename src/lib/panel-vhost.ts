import "server-only";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { requirePremiumFeature } from "./premium/guard";

const execFileAsync = promisify(execFile);

const PANEL_VHOST_SCRIPT =
  process.env.QADBAK_PANEL_VHOST_SCRIPT ??
  "/opt/qadbak/scripts/apply-client-panel-vhost.sh";

/** Pure helper — no Premium gate. */
export function panelVhostHostname(domain: string): string {
  return `panel.${domain.trim().toLowerCase()}`;
}

/**
 * Returns true when the panel-vhost sudo wrapper is installed AND the
 * Premium `panel-client-vhost` feature is licensed. We deliberately
 * resolve the gate first so a Core panel never advertises the feature
 * as available even if the script happens to be present.
 */
export async function panelVhostAvailable(): Promise<boolean> {
  try {
    await requirePremiumFeature("panel-client-vhost");
  } catch {
    return false;
  }
  try {
    await access(PANEL_VHOST_SCRIPT);
    await execFileAsync("sudo", ["-n", PANEL_VHOST_SCRIPT, "__probe__"], {
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function applyClientPanelVhost(domain: string): Promise<string> {
  await requirePremiumFeature("panel-client-vhost");
  const { stdout, stderr } = await execFileAsync(
    "sudo",
    ["-n", PANEL_VHOST_SCRIPT, domain.trim().toLowerCase()],
    { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
  );
  return (
    [stdout, stderr].filter(Boolean).join("\n").trim() || "Panel vhost applied."
  );
}
