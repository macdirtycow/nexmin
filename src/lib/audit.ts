import { appendFile, mkdir } from "fs/promises";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "data", "audit.log");

export async function auditLog(
  username: string,
  action: string,
  domain?: string,
  detail?: string,
): Promise<void> {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    username,
    action,
    domain,
    detail,
  });
  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true });
    await appendFile(LOG_PATH, line + "\n", "utf8");
  } catch {
    // non-fatal
  }
}
