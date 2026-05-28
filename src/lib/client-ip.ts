import { headers } from "next/headers";
import { trustProxyHeaders } from "./security-config";

/** Client IP from reverse-proxy headers when QADBAK_TRUST_PROXY allows it. */
export async function getClientIp(): Promise<string | undefined> {
  if (!trustProxyHeaders()) return undefined;
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip")?.trim();
  return real || undefined;
}
