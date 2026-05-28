import { getProvisioner } from "./provisioner";
import type { ApiKeyRecord } from "./api-keys";
import type { HostedDomain } from "./types";

const actor = { role: "admin" as const, domains: [] as string[] };

type DomainRow = HostedDomain & {
  reseller?: string;
  parent?: string;
};

function normalizeDomainName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * True when a domain belongs to a reseller API key (exact reseller tag on registry row,
 * or sub/alias whose parent domain is tagged for that reseller).
 */
export function domainMatchesResellerScope(
  row: DomainRow,
  resellerId: string,
  byName: Map<string, DomainRow>,
): boolean {
  const want = resellerId.trim();
  if (!want) return true;

  const tagged = String(row.reseller ?? "").trim();
  if (tagged === want) return true;

  const parent = String(row.parent ?? "").trim().toLowerCase();
  if (parent) {
    const parentRow = byName.get(parent);
    if (parentRow && String(parentRow.reseller ?? "").trim() === want) {
      return true;
    }
  }

  return false;
}

export function filterDomainsForResellerKey(
  domains: HostedDomain[],
  resellerId: string | undefined,
): HostedDomain[] {
  if (!resellerId?.trim()) return domains;
  const byName = new Map<string, DomainRow>();
  for (const d of domains) {
    byName.set(normalizeDomainName(d.name), d as DomainRow);
  }
  return domains.filter((d) =>
    domainMatchesResellerScope(d as DomainRow, resellerId, byName),
  );
}

export async function assertApiV1DomainAccess(
  key: ApiKeyRecord,
  domain: string,
): Promise<void> {
  const normalized = normalizeDomainName(domain);
  const domains = await getProvisioner().listDomains(actor);
  const row = domains.find((d) => normalizeDomainName(d.name) === normalized);
  if (!row) {
    throw Object.assign(new Error(`Domain not found: ${normalized}`), { status: 404 });
  }
  if (key.resellerId) {
    const byName = new Map<string, DomainRow>();
    for (const d of domains) {
      byName.set(normalizeDomainName(d.name), d as DomainRow);
    }
    if (!domainMatchesResellerScope(row as DomainRow, key.resellerId, byName)) {
      throw Object.assign(new Error("Domain not in reseller scope."), { status: 403 });
    }
  }
}

export function apiV1Actor() {
  return actor;
}
