import { readFileSync } from "fs";
import { join } from "path";

const cachedBodies = new Map<string, string>();

function extractBody(htmlPath: string): string {
  const cached = cachedBodies.get(htmlPath);
  if (cached) return cached;
  const raw = readFileSync(join(process.cwd(), htmlPath), "utf8");
  const match = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!match) {
    throw new Error(`${htmlPath}: missing <body>`);
  }
  const body = match[1].replace(
    /<script[^>]*src="[^"]*landing\.js"[^>]*>\s*<\/script>\s*/i,
    "",
  );
  cachedBodies.set(htmlPath, body);
  return body;
}

/** Inner HTML of marketing-site/index.html (shared with static zip). */
export function getMarketingBodyHtml(): string {
  return extractBody("marketing-site/index.html");
}

/** Inner HTML of a legal page (e.g. "privacy", "terms", "refund"). */
export function getLegalBodyHtml(
  slug: "privacy" | "terms" | "refund",
): string {
  return extractBody(`marketing-site/${slug}/index.html`);
}
