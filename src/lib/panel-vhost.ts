import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PANEL_VHOST_SCRIPT =
  process.env.QADBAK_PANEL_VHOST_SCRIPT ??
  "/opt/qadbak/scripts/apply-client-panel-vhost.sh";

export function panelVhostHostname(domain: string): string {
  return `panel.${domain.trim().toLowerCase()}`;
}

export async function panelVhostAvailable(): Promise<boolean> {
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
  const { stdout, stderr } = await execFileAsync(
    "sudo",
    ["-n", PANEL_VHOST_SCRIPT, domain.trim().toLowerCase()],
    { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
  );
  return [stdout, stderr].filter(Boolean).join("\n").trim() || "Panel vhost applied.";
}
