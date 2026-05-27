import { legacyPanelUiBase } from "./legacy-panel";

/** Public base for server admin when proxied under the panel (same origin as Qadbak). */
export function legacyPanelEmbedPublicBase(): string | null {
  const explicit = process.env.QADBAK_LEGACY_PANEL_EMBED_BASE?.replace(/\/$/, "");
  if (explicit) return explicit;
  const panel = process.env.QADBAK_PANEL_URL?.replace(/\/$/, "");
  if (panel) return `${panel}/embed/legacy-panel`;
  return null;
}

function directLegacyPanelOrigins(): string[] {
  const bases = [
    process.env.QADBAK_LEGACY_PANEL_URL,
    process.env.QADBAK_LEGACY_PANEL_URL,
    "https://localhost:10000",
    "http://localhost:10000",
    "https://127.0.0.1:10000",
  ];
  const origins = new Set<string>();
  for (const b of bases) {
    if (!b?.trim()) continue;
    try {
      const u = new URL(b.includes("://") ? b : `https://${b}`);
      if (u.port === "10000" || u.pathname === "/") {
        origins.add(u.origin);
      }
    } catch {
      /* ignore */
    }
  }
  try {
    origins.add(new URL(legacyPanelUiBase()).origin);
  } catch {
    /* ignore */
  }
  return [...origins];
}

/** Rewrite :10000 login URLs to the panel /embed/legacy-panel/ proxy when configured. */
export function rewriteLegacyPanelLoginUrlForEmbed(url: string): string {
  const embedBase = legacyPanelEmbedPublicBase();
  if (!embedBase || !url.startsWith("http")) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const directOrigins = directLegacyPanelOrigins();
  if (embedBase) {
    try {
      const embedOrigin = new URL(embedBase).origin;
      if (parsed.origin === embedOrigin && parsed.pathname.includes("/embed/legacy-panel")) {
        return url;
      }
    } catch {
      /* ignore */
    }
  }

  const isDirectLegacyPanel =
    parsed.port === "10000" ||
    directOrigins.some((o) => parsed.origin === o);

  if (!isDirectLegacyPanel) return url;

  try {
    const embed = new URL(embedBase);
    const prefix = embed.pathname.replace(/\/$/, "");
    parsed.protocol = embed.protocol;
    parsed.host = embed.host;
    parsed.pathname = `${prefix}${parsed.pathname}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Domain-scoped xterm path (avoids blank/root shell for domain owners). */
export function domainTerminalEmbedPath(unixUser: string): string {
  const home = `/home/${unixUser}`;
  const q = new URLSearchParams({
    user: unixUser,
    dir: home,
  });
  return `/xterm/index.cgi?${q.toString()}`;
}
