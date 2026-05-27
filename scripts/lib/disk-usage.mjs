import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

const exec = promisify(execFile);

/** Directory size in kilobytes (du -sk). */
export async function pathSizeKb(targetPath) {
  const p = String(targetPath || "").trim();
  if (!p) return 0;
  try {
    await access(p, constants.R_OK);
  } catch {
    return 0;
  }
  try {
    const { stdout } = await exec("du", ["-sk", p], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const kb = Number.parseInt(String(stdout).trim().split(/\s+/)[0], 10);
    return Number.isFinite(kb) && kb >= 0 ? kb : 0;
  } catch {
    return 0;
  }
}

/** Human-readable MB for panel tables (1 decimal under 10 MB). */
export function kbToDisplayMb(kb) {
  const n = Number(kb) || 0;
  if (n <= 0) return "0";
  const mb = n / 1024;
  return mb < 10 ? mb.toFixed(1) : String(Math.round(mb));
}

/** du -sm style: whole MB from path (for domain home). */
export async function pathSizeMbRounded(targetPath) {
  const p = String(targetPath || "").trim();
  if (!p) return "0";
  try {
    await access(p, constants.R_OK);
  } catch {
    return "0";
  }
  try {
    const { stdout } = await exec("du", ["-sm", p], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const mb = stdout.split("\t")[0]?.trim();
    return mb && /^\d+(\.\d+)?$/.test(mb) ? mb : "0";
  } catch {
    return "0";
  }
}
