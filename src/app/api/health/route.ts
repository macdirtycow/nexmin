import { APP_NAME, APP_SITE } from "@/lib/brand";
import { getProvisionerId } from "@/lib/provisioner";
import { NextResponse } from "next/server";

/** Public liveness check for nginx/monitoring (no auth). */
export async function GET() {
  const mock = process.env.VIRTUALMIN_MOCK === "true";
  return NextResponse.json({
    ok: true,
    app: APP_NAME,
    host: APP_SITE,
    mock,
    provisioner: getProvisionerId(),
    ts: new Date().toISOString(),
  });
}
