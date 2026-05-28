import fs from "fs/promises";
import path from "path";

const BUCKET_FILE = path.join(process.cwd(), "data", "api-rate-buckets.json");

interface BucketFile {
  buckets: Record<string, { count: number; resetAt: number }>;
}

async function load(): Promise<BucketFile> {
  try {
    return JSON.parse(await fs.readFile(BUCKET_FILE, "utf8")) as BucketFile;
  } catch {
    return { buckets: {} };
  }
}

async function save(data: BucketFile): Promise<void> {
  await fs.mkdir(path.dirname(BUCKET_FILE), { recursive: true });
  await fs.writeFile(BUCKET_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Read-modify-write with short retry to reduce lost updates under concurrency. */
async function updateBuckets(
  mutator: (data: BucketFile) => void,
): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const data = await load();
    mutator(data);
    try {
      await save(data);
      return;
    } catch {
      if (attempt === 4) throw new Error("Rate limit store busy.");
      await new Promise((r) => setTimeout(r, 15 * (attempt + 1)));
    }
  }
}

function peekBucket(
  data: BucketFile,
  bucketKey: string,
  limit: number,
  windowMs: number,
  now: number,
): { ok: boolean; retryAfterSec?: number } {
  const row = data.buckets[bucketKey];
  if (!row || now >= row.resetAt) return { ok: true };
  if (row.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((row.resetAt - now) / 1000) };
  }
  return { ok: true };
}

/** Check limit without consuming a slot (login pre-check). */
export async function peekRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const now = Date.now();
  const data = await load();
  return peekBucket(data, bucketKey, limit, windowMs, now);
}

/** Record one failed attempt (login brute-force). */
export async function recordRateLimitFailure(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  await updateBuckets((data) => {
    const row = data.buckets[bucketKey];
    if (!row || now >= row.resetAt) {
      data.buckets[bucketKey] = { count: 1, resetAt: now + windowMs };
      return;
    }
    row.count += 1;
  });
}

/** Fixed-window rate limit — each allowed request consumes one slot. */
export async function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const now = Date.now();
  let result: { ok: boolean; retryAfterSec?: number } = { ok: true };
  await updateBuckets((data) => {
    const row = data.buckets[bucketKey];
    if (!row || now >= row.resetAt) {
      data.buckets[bucketKey] = { count: 1, resetAt: now + windowMs };
      result = { ok: true };
      return;
    }
    if (row.count >= limit) {
      result = {
        ok: false,
        retryAfterSec: Math.ceil((row.resetAt - now) / 1000),
      };
      return;
    }
    row.count += 1;
    result = { ok: true };
  });
  return result;
}

/** Per API key id — default 120 req/min. */
export async function checkApiRateLimit(
  keyId: string,
  limit = 120,
  windowMs = 60_000,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  return checkRateLimit(`api:${keyId}`, limit, windowMs);
}

const LOGIN_LIMIT = Number(process.env.QADBAK_LOGIN_RATE_LIMIT ?? "8") || 8;
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_IP_LIMIT = Number(process.env.QADBAK_LOGIN_RATE_LIMIT_PER_IP ?? "40") || 40;

/** Brute-force guard for panel sign-in (peek only — bump on failed password/TOTP). */
export async function checkLoginRateLimit(
  clientIp: string,
  username: string,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const user = username.trim().toLowerCase() || "unknown";
  const ip = clientIp.trim() || "unknown";
  const byIp = await peekRateLimit(`login-ip:${ip}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS);
  if (!byIp.ok) return byIp;
  return peekRateLimit(`login:${ip}:${user}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export async function recordLoginRateLimitFailure(
  clientIp: string,
  username: string,
): Promise<void> {
  const user = username.trim().toLowerCase() || "unknown";
  const ip = clientIp.trim() || "unknown";
  await recordRateLimitFailure(`login-ip:${ip}`, LOGIN_IP_LIMIT, LOGIN_WINDOW_MS);
  await recordRateLimitFailure(`login:${ip}:${user}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}
