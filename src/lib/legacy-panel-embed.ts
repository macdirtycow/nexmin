import { domainTerminalEmbedPath } from "./legacy-panel-embed-url";

/** server admin paths for domain embeds (create-login-link redirect-url). */
export const QADBAK_LEGACY_API_EMBED_PATHS = {
  terminal: "/xterm/",
  shell: "/shell/",
  fileman: "/filemin/index.cgi",
} as const;

export type LegacyPanelEmbedDest = keyof typeof QADBAK_LEGACY_API_EMBED_PATHS;

const ALLOWED_LEGACY_REDIRECT_PREFIXES = [
  "/filemin/",
  "/xterm/",
  "/shell/",
] as const;

/** Block open redirects (//evil.com, https://…) when building legacy panel login links. */
export function normalizeLegacyPanelRedirect(path: string): string {
  const p = path.trim();
  if (!p.startsWith("/") || p.startsWith("//") || /[\s:]/.test(p.slice(0, 8))) {
    throw new Error("Invalid redirect path.");
  }
  if (
    !ALLOWED_LEGACY_REDIRECT_PREFIXES.some((prefix) => p.startsWith(prefix))
  ) {
    throw new Error("Redirect path is not allowed.");
  }
  return p;
}

export function legacyPanelEmbedPath(
  dest: string | null,
  domainUnixUser?: string,
): string | undefined {
  if (!dest) return undefined;
  if (dest === "terminal" && domainUnixUser) {
    return domainTerminalEmbedPath(domainUnixUser);
  }
  if (dest in QADBAK_LEGACY_API_EMBED_PATHS) {
    return QADBAK_LEGACY_API_EMBED_PATHS[dest as LegacyPanelEmbedDest];
  }
  const raw = dest.startsWith("/") ? dest : `/${dest}`;
  return normalizeLegacyPanelRedirect(raw);
}
