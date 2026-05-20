import type { VirtualMinDomain } from "./types";

export function isDomainDisabled(domain: VirtualMinDomain): boolean {
  const v = domain.disabled ?? domain["values.disabled"];
  return String(v) === "1" || v === true || String(v) === "true";
}
