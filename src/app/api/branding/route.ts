import { handleApiError, jsonOk } from "@/lib/api";
import {
  brandingPublicPayload,
  displayBranding,
  loadPanelBranding,
} from "@/lib/branding";

export async function GET() {
  try {
    const stored = await loadPanelBranding();
    const b = displayBranding(stored);
    return jsonOk(brandingPublicPayload(b));
  } catch (err) {
    return handleApiError(err);
  }
}
