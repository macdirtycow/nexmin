import { domainTerminalEmbedPath } from "./legacy-panel-embed-url";

/** server admin paths for domain embeds (create-login-link redirect-url). */
export const QADBAK_LEGACY_API_EMBED_PATHS = {
  terminal: "/xterm/",
  shell: "/shell/",
  fileman: "/filemin/index.cgi",
} as const;

export type LegacyPanelEmbedDest = keyof typeof QADBAK_LEGACY_API_EMBED_PATHS;

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
  return dest.startsWith("/") ? dest : `/${dest}`;
}
