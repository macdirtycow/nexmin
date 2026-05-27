/** Per-file upload cap for Core (panel-enforced). */
export const UPLOAD_LIMIT_CORE_BYTES = 100 * 1024 ** 3;

/** @deprecated Use UPLOAD_LIMIT_CORE_BYTES */
export const UPLOAD_LIMIT_FREE_BYTES = UPLOAD_LIMIT_CORE_BYTES;

/** Editor / save-in-panel — unchanged small cap. */
export const UPLOAD_LIMIT_EDITOR_BYTES = 10 * 1024 ** 2;

/** `null` = Premium: no panel byte cap (disk / nginx may still apply). */
export type UploadByteLimit = number | null;

export function maxUploadBytesForPremium(premium: boolean): UploadByteLimit {
  return premium ? null : UPLOAD_LIMIT_CORE_BYTES;
}

export function exceedsUploadLimit(size: number, limit: UploadByteLimit): boolean {
  return limit !== null && size > limit;
}

export function formatUploadLimit(limit: UploadByteLimit): string {
  if (limit === null) return "no panel limit";
  if (limit >= 1024 ** 3) {
    const gb = limit / 1024 ** 3;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  }
  if (limit >= 1024 ** 2) {
    const mb = limit / 1024 ** 2;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(0)} MB`;
  }
  const kb = limit / 1024;
  return `${Number.isInteger(kb) ? kb : kb.toFixed(0)} KB`;
}
