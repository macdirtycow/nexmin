import fs from "fs/promises";
import path from "path";

const BUCKET_DIR = path.join(process.cwd(), "data", "api-rate-buckets.json");

interface BucketFile {
  buckets: Record<string, { count: number; resetAt: number }>;
}

async function load(): Promise<BucketFile> {
  try {
    return JSON.parse(await fs.readFile(BUCKET_DIR, "utf8")) as BucketFile;
  } catch {
    return { buckets: {} };
  }
}

async function save(data: BucketFile): Promise<void> {
  await fs.mkdir(path.dirname(BUCKET_DIR), { recursive: true });
  await fs.writeFile(BUCKET_DIR, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Simple fixed-window rate limit (API keys, login, etc.). */
export async function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const now = Date.now();
  const data = await load();
  const row = data.buckets[bucketKey];
  if (!row || now >= row.resetAt) {
    data.buckets[bucketKey] = { count: 1, resetAt: now + windowMs };
    await save(data);
    return { ok: true };
  }
  if (row.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((row.resetAt - now) / 1000) };
  }
  row.count += 1;
  await save(data);
  return { ok: true };
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

/** Brute-force guard for panel sign-in (per IP + username). */
export async function checkLoginRateLimit(
  clientIp: string,
  username: string,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const user = username.trim().toLowerCase() || "unknown";
  const ip = clientIp.trim() || "unknown";
  const byIp = await checkRateLimit(
    `login-ip:${ip}`,
    LOGIN_IP_LIMIT,
    LOGIN_WINDOW_MS,
  );
  if (!byIp.ok) return byIp;
  return checkRateLimit(`login:${ip}:${user}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
}
