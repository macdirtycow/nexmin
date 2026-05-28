import { headers } from "next/headers";

/** Client IP from reverse-proxy headers (nginx should set X-Forwarded-For / X-Real-IP). */
export async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip")?.trim();
  return real || undefined;
}
