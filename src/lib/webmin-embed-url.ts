import { webminUiBase } from "./webmin";

/** Public base for Webmin when proxied under the panel (same origin as Qadbak). */
export function webminEmbedPublicBase(): string | null {
  const explicit = process.env.QADBAK_WEBMIN_EMBED_BASE?.replace(/\/$/, "");
  if (explicit) return explicit;
  const panel = process.env.QADBAK_PANEL_URL?.replace(/\/$/, "");
  if (panel) return `${panel}/embed/webmin`;
  return null;
}

function directWebminOrigins(): string[] {
  const bases = [
    process.env.WEBMIN_UI_URL,
    process.env.VIRTUALMIN_UI_URL,
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
    origins.add(new URL(webminUiBase()).origin);
  } catch {
    /* ignore */
  }
  return [...origins];
}

/** Rewrite :10000 login URLs to the panel /embed/webmin/ proxy when configured. */
export function rewriteWebminLoginUrlForEmbed(url: string): string {
  const embedBase = webminEmbedPublicBase();
  if (!embedBase || !url.startsWith("http")) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const directOrigins = directWebminOrigins();
  const isDirectWebmin =
    parsed.port === "10000" ||
    directOrigins.some((o) => parsed.origin === o);

  if (!isDirectWebmin) return url;

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
