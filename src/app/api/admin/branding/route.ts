import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  displayBranding,
  loadPanelBranding,
  logoPublicPath,
  savePanelBranding,
  type PanelBrandingInput,
} from "@/lib/branding";
import { requirePremiumFeature } from "@/lib/premium/guard";

export async function GET() {
  try {
    await requireAdmin();
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

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    await requirePremiumFeature("white-label");
    const body = (await request.json()) as PanelBrandingInput;
    const stored = await savePanelBranding(body);
    await auditLog(
      session.username,
      body.reset ? "branding-reset" : "branding-update",
    );
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
