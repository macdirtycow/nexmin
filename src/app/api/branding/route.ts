import { handleApiError, jsonOk } from "@/lib/api";
import { displayBranding, loadPanelBranding, logoPublicPath } from "@/lib/branding";

export async function GET() {
  try {
    const stored = await loadPanelBranding();
    const b = displayBranding(stored);
    return jsonOk({
      brandName: b.brandName,
      tagline: b.tagline,
      primaryColor: b.primaryColor,
      accentColor: b.accentColor,
      logoUrl: logoPublicPath(b.hasLogo),
      isCustom: b.isCustom,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
