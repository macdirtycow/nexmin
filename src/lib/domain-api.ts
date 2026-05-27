import { notFound } from "next/navigation";
import { getSession, requireSession } from "./session";
import type { HostedDomain } from "./types";
import { getProvisioner } from "./provisioner";

async function resolveDomain(
  encodedDomain: string,
  onMissing: () => never,
): Promise<{
  session: Awaited<ReturnType<typeof requireSession>>;
  domain: string;
  domainInfo: HostedDomain;
}> {
  const session = await requireSession();
  const domainName = decodeURIComponent(encodedDomain);
  const domains = await getProvisioner().listDomains(session);
  const found = domains.find(
    (d) => d.name.toLowerCase() === domainName.toLowerCase(),
  );
  if (!found) onMissing();
  return { session, domain: domainName, domainInfo: found };
}

/** For server components / layouts */
export async function requireDomainAccess(encodedDomain: string) {
  return resolveDomain(encodedDomain, () => notFound());
}

/** For API route handlers */
export async function requireDomainApi(encodedDomain: string) {
  return resolveDomain(encodedDomain, () => {
    throw new Error("Domain not found.");
  });
}

export async function getSessionIfPresent() {
  return getSession();
}
