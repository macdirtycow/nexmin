import "server-only";

import { checkRateLimit } from "./api-rate-limit";
import { getClientIp } from "./client-ip";
import type { SessionPayload } from "./types";

const WINDOW_MS = 60_000;
const PER_USER_LIMIT = Number(process.env.QADBAK_API_RATE_LIMIT_PER_USER ?? "300") || 300;
const PER_IP_LIMIT = Number(process.env.QADBAK_API_RATE_LIMIT_PER_IP ?? "600") || 600;

/** Throttle authenticated API abuse (per user + per IP). */
export async function checkSessionApiRateLimit(
  session: SessionPayload,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const ip = (await getClientIp()) ?? "unknown";
  const byUser = await checkRateLimit(
    `sess:${session.userId}`,
    PER_USER_LIMIT,
    WINDOW_MS,
  );
  if (!byUser.ok) return byUser;
  return checkRateLimit(`sess-ip:${ip}`, PER_IP_LIMIT, WINDOW_MS);
}
