import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { PremiumRequiredError } from "./types";
import { isPremiumFeatureEnabled } from "./server";

export { PremiumRequiredError } from "./types";

export async function requirePremiumFeature(featureId: string): Promise<void> {
  if (!(await isPremiumFeatureEnabled(featureId))) {
    throw new PremiumRequiredError(featureId);
  }
}

export function premiumApiError(err: unknown): Response {
  if (err instanceof PremiumRequiredError) {
    return NextResponse.json(
      {
        error: err.message,
        code: "PREMIUM_REQUIRED",
        feature: err.feature,
      },
      { status: 503 },
    );
  }
  return handleApiError(err);
}
