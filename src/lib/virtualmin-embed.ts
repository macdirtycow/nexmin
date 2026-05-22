/** Webmin paths for domain embeds (create-login-link redirect-url). */
export const VIRTUALMIN_EMBED_PATHS = {
  terminal: "/xterm/",
  shell: "/shell/",
  fileman: "/filemin/index.cgi",
} as const;

export type VirtualminEmbedDest = keyof typeof VIRTUALMIN_EMBED_PATHS;

export function virtualminEmbedPath(dest: string | null): string | undefined {
  if (!dest) return undefined;
  if (dest in VIRTUALMIN_EMBED_PATHS) {
    return VIRTUALMIN_EMBED_PATHS[dest as VirtualminEmbedDest];
  }
  return dest.startsWith("/") ? dest : `/${dest}`;
}
