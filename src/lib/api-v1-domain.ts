import { getProvisioner } from "./provisioner";
import type { ApiKeyRecord } from "./api-keys";

const actor = { role: "admin" as const, domains: [] as string[] };

export async function assertApiV1DomainAccess(
  key: ApiKeyRecord,
  domain: string,
): Promise<void> {
  const normalized = domain.trim().toLowerCase();
  const domains = await getProvisioner().listDomains(actor);
  const row = domains.find((d) => d.name === normalized);
  if (!row) {
    throw Object.assign(new Error(`Domain not found: ${normalized}`), { status: 404 });
  }
  if (key.resellerId) {
    const reseller = key.resellerId;
    const match =
      (row as { reseller?: string }).reseller === reseller ||
      (row as { parent?: string }).parent === reseller ||
      (row as { plan?: string }).plan?.includes(reseller);
    if (!match) {
      throw Object.assign(new Error("Domain not in reseller scope."), { status: 403 });
    }
  }
}

export function apiV1Actor() {
  return actor;
}
