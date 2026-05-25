import { premiumLibUnavailable } from "@/lib/premium/unavailable";

export function panelVhostHostname(domain: string): string {
  return `panel.${domain.trim().toLowerCase()}`;
}

/**
 * Returns false when Premium `panel-client-vhost` module isn't loaded.
 * Premium overrides this with the real sudoers check.
 */
export async function panelVhostAvailable(): Promise<boolean> {
  return false;
}

export async function applyClientPanelVhost(_domain: string): Promise<string> {
  premiumLibUnavailable("panel-client-vhost");
}
