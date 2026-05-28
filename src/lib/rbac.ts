import { ADMIN_CLOUD_PROGRAMS, ADMIN_SERVER_PROGRAMS, programsForRole } from "./features";
import type { Role } from "./types";

export function isProgramAllowed(role: Role, program: string): boolean {
  return programsForRole(role).includes(program);
}

const DOMAIN_OPTIONAL_PROGRAMS = [
  "list-domains",
  "get-command",
  "create-domain",
  "check-config",
  "list-available-scripts",
  ...ADMIN_SERVER_PROGRAMS,
  ...ADMIN_CLOUD_PROGRAMS,
];

/** Enforce client domain allowlist (admin bypass). Use for native/API paths without a hosting program name. */
export function assertActorDomainAccess(
  actor: { role: Role; domains: string[] },
  domain: string,
): void {
  if (actor.role === "admin") return;
  const normalized = domain.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Domain parameter is missing.");
  }
  const allowed = actor.domains.map((d) => d.toLowerCase());
  if (!allowed.includes(normalized)) {
    throw new Error("No access to this domain.");
  }
}

export function assertDomainAccess(
  role: Role,
  allowedDomains: string[],
  domain: string | undefined,
  program: string,
): void {
  if (DOMAIN_OPTIONAL_PROGRAMS.includes(program)) {
    if (role === "client" && program === "list-domains") return;
    return;
  }
  if (!domain) {
    throw new Error("Domain parameter is missing.");
  }
  if (role === "admin") return;
  const normalized = domain.toLowerCase();
  const allowed = allowedDomains.map((d) => d.toLowerCase());
  if (!allowed.includes(normalized)) {
    throw new Error("No access to this domain.");
  }
}
