import { APP_NAME, APP_SITE } from "@/lib/brand";
import { installFingerprintTag } from "@/lib/install-salt";
import { healthMinimalPublic } from "@/lib/security-config";
import { getProvisionerId } from "@/lib/provisioner";
import { listEnabledNativeFeatures } from "@/lib/provisioner/native-features";
import type { ProvisionerId } from "@/lib/provisioner/types";
import { NextResponse } from "next/server";

function publicProvisionerId(id: ProvisionerId): string {
  if (id === "legacy-remote") return "legacy-remote";
  return id;
}

/** Public liveness check for nginx/monitoring (no auth). */
export async function GET() {
  if (healthMinimalPublic()) {
    return NextResponse.json({ ok: true });
  }
  const mock = process.env.QADBAK_LEGACY_API_MOCK === "true";
  const fb = process.env.QADBAK_LEGACY_API_FALLBACK?.trim().toLowerCase();
  const fallback =
    fb === "false" || fb === "0" || fb === "no" ? false : Boolean(fb ?? true);
  const fingerprintTag = installFingerprintTag();
  return NextResponse.json({
    ok: true,
    app: APP_NAME,
    host: APP_SITE,
    mock,
    provisioner: publicProvisionerId(getProvisionerId()),
    legacyApiFallback: fallback,
    nativeFeatures: listEnabledNativeFeatures(),
    fingerprintTag,
    ts: new Date().toISOString(),
  });
}
