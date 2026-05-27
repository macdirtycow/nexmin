import type { HostedDomain } from "./types";

export function isDomainDisabled(domain: HostedDomain): boolean {
  const v = domain.disabled ?? domain["values.disabled"];
  return String(v) === "1" || v === true || String(v) === "true";
}
