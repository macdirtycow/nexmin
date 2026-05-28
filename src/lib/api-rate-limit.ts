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

/** Simple fixed-window rate limit per API key id. */
export async function checkApiRateLimit(
  keyId: string,
  limit = 120,
  windowMs = 60_000,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  const now = Date.now();
  const data = await load();
  const row = data.buckets[keyId];
  if (!row || now >= row.resetAt) {
    data.buckets[keyId] = { count: 1, resetAt: now + windowMs };
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
