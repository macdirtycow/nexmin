import "server-only";

import { isPremiumActive } from "@/lib/qadbak-license";
import {
  maxUploadBytesForPremium,
  UPLOAD_LIMIT_CORE_BYTES,
  UPLOAD_LIMIT_FREE_BYTES,
  type UploadByteLimit,
} from "@/lib/upload-limits";

export async function getMaxUploadBytes(): Promise<UploadByteLimit> {
  const premium = await isPremiumActive();
  return maxUploadBytesForPremium(premium);
}

export async function getUploadLimitInfo(): Promise<{
  maxBytes: UploadByteLimit;
  premium: boolean;
}> {
  const premium = await isPremiumActive();
  return {
    premium,
    maxBytes: maxUploadBytesForPremium(premium),
  };
}

export { UPLOAD_LIMIT_CORE_BYTES, UPLOAD_LIMIT_FREE_BYTES };
