import "server-only";
import { access } from "node:fs/promises";
import { domainToClientUsername } from "./domain-username";
import { randomPanelPassword } from "./panel-password";
import {
  applyClientPanelVhost,
  panelVhostAvailable,
  panelVhostHostname,
} from "./panel-vhost";
import { requirePremiumFeature } from "./premium/guard";
import { findUserByUsername } from "./users";
import {
  assignDomainToClient,
  createClientUser,
  findClientForDomain,
  setClientPassword,
} from "./users-client";

function panelVhostConfigPath(domain: string): string {
  const safe = domain.trim().toLowerCase().replace(/\./g, "-");
  return `/etc/nginx/sites-enabled/qadbak-panel-${safe}.conf`;
}

export async function getPanelClientStatus(domain: string) {
  await requirePremiumFeature("panel-client-vhost");
  const domainName = domain.trim().toLowerCase();
  const suggestedUsername = domainToClientUsername(domainName);
  const linked = await findClientForDomain(domainName);
  const byName = await findUserByUsername(suggestedUsername);
  const client = linked ?? (byName?.role === "client" ? byName : undefined);
  let vhostConfigured = false;
  try {
    await access(panelVhostConfigPath(domainName));
    vhostConfigured = true;
  } catch {
    /* not yet applied */
  }
  const panelUrl = `http://${panelVhostHostname(domainName)}/login`;
  return {
    domain: domainName,
    suggestedUsername,
    client: client
      ? { username: client.username, domains: client.domains ?? [] }
      : null,
    panelUrl,
    vhostConfigured,
    panelVhostAvailable: await panelVhostAvailable(),
  };
}

export async function upsertPanelClient(opts: {
  domain: string;
  password?: string;
  username?: string;
}): Promise<{ username: string; created: boolean; password: string }> {
  await requirePremiumFeature("panel-client-vhost");
  const domainName = opts.domain.trim().toLowerCase();
  const username = domainToClientUsername(domainName, opts.username);
  const existing = await findUserByUsername(username);
  const password = opts.password?.trim() || randomPanelPassword();
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!existing) {
    await createClientUser({
      username,
      password,
      domains: [domainName],
    });
    return { username, created: true, password };
  }
  if (existing.role !== "client") {
    throw new Error(`Username ${username} is not a client account.`);
  }
  await setClientPassword(username, password);
  await assignDomainToClient(username, domainName);
  return { username, created: false, password };
}

export async function ensurePanelVhost(domain: string): Promise<string> {
  await requirePremiumFeature("panel-client-vhost");
  if (!(await panelVhostAvailable())) {
    throw new Error(
      "Panel vhost sudo not configured. Run: sudo bash scripts/configure-panel-vhost-sudo.sh",
    );
  }
  return applyClientPanelVhost(domain.trim().toLowerCase());
}

export { panelVhostAvailable, applyClientPanelVhost, panelVhostHostname };
