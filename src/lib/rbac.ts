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
    throw new Error("Domeinparameter ontbreekt.");
  }
  if (role === "admin") return;
  const normalized = domain.toLowerCase();
  const allowed = allowedDomains.map((d) => d.toLowerCase());
  if (!allowed.includes(normalized)) {
    throw new Error("Geen toegang tot dit domein.");
  }
}
