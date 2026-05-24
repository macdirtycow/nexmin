/** Derive a panel client username from a domain name (first label, sanitized). */
export function domainToClientUsername(
  domain: string,
  explicit?: string,
): string {
  const fromExplicit = String(explicit ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  if (fromExplicit) return fromExplicit;
  const label = domain.split(".")[0] ?? "site";
  const base = label.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return base || "site";
}
