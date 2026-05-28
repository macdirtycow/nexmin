import { headers } from "next/headers";
import { jsonError } from "./api";
import { checkApiRateLimit } from "./api-rate-limit";
import { getClientIp } from "./client-ip";
import { verifyApiKey, type ApiKeyScope } from "./api-keys";

export async function requireApiV1(scope: ApiKeyScope) {
  const h = await headers();
  const auth = h.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    throw Object.assign(new Error("Missing Bearer API key."), { status: 401 });
  }
  const ip = await getClientIp();
  const key = await verifyApiKey(token, scope, ip);
  if (!key) {
    throw Object.assign(new Error("Invalid API key or scope."), { status: 403 });
  }
  const rl = await checkApiRateLimit(key.id);
  if (!rl.ok) {
    throw Object.assign(
      new Error(`Rate limit exceeded. Retry in ${rl.retryAfterSec ?? 60}s.`),
      { status: 429 },
    );
  }
  return key;
}

export function apiV1Error(err: unknown) {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: number }).status)
      : 500;
  const message = err instanceof Error ? err.message : "Error";
  return jsonError(message, status);
}
