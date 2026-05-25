/**
 * Client RBAC path matcher — Premium `client-rbac` module.
 *
 * Edge-safe (no node:fs / no `server-only`). The enforcement layer lives
 * in `src/middleware.ts`, which only calls into this module if the
 * `client-rbac` feature is currently enabled (license activation syncs
 * the feature list into `.env.local` via `premium/env-sync`, so the
 * Edge runtime can see it through `process.env.QADBAK_PREMIUM_FEATURES`).
 *
 * Pages and API handlers under /admin/* enforce admin role at the
 * server layer anyway (`requireAdmin` / `requireAdminPage`); this is
 * the belt-and-suspenders edge gate that fences off everything in one
 * place and also blocks routes that aren't /admin but should still be
 * admin-only (e.g. /domains/new, /api/server/*).
 */

export const CLIENT_BLOCKED_PREFIXES = [
  "/admin",
  "/api/admin",
  "/fases",
  "/domains/new",
  "/api/server/",
] as const;

export function isClientBlockedPath(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname === "/fases" || pathname.startsWith("/fases/")) return true;
  if (pathname === "/domains/new") return true;
  if (pathname.startsWith("/api/server/")) return true;
  return false;
}

/**
 * Edge-safe Premium feature check. Mirrors the env-only fast path of
 * `isPremiumFeatureEnabled` in `src/lib/premium/server.ts`, which is
 * enough because license activation always writes the active feature
 * list to `process.env.QADBAK_PREMIUM_FEATURES`. Crypto verification
 * still happens server-side on every privileged API call via
 * `requirePremiumFeature`.
 */
export function clientRbacEnabled(): boolean {
  return (process.env.QADBAK_PREMIUM_FEATURES ?? "")
    .split(",")
    .map((s) => s.trim())
    .includes("client-rbac");
}
