import { BrandingEditor } from "@/components/BrandingEditor";
import { displayBranding, loadPanelBranding, logoPublicPath } from "@/lib/branding";
import { PremiumUpgradeCard } from "@/lib/premium/stubs";
import { requireAdminPage } from "@/lib/admin-api";
import { getLicensePublicInfo, isPremiumActive } from "@/lib/qadbak-license";
import { isPremiumFeatureEnabled } from "@/lib/premium/server";

export default async function BrandingPage() {
  await requireAdminPage();
  const premium = await isPremiumFeatureEnabled("white-label");
  const license = await getLicensePublicInfo();
  const premiumActive = await isPremiumActive();
  const stored = await loadPanelBranding();
  const b = displayBranding(stored);

  if (!premium) {
    return (
      <PremiumUpgradeCard
        feature="white-label"
        title="White-label branding (Premium)"
        premiumActive={premiumActive}
        licensedFeatures={license.features}
        verifyError={license.verifyError}
      />
    );
  }

  return (
    <BrandingEditor
      initial={{
        brandName: b.isCustom ? b.brandName : "",
        tagline: b.isCustom ? b.tagline : "",
        themeId: b.themeId,
        logoUrl: logoPublicPath(b.hasLogo),
        isCustom: b.isCustom,
      }}
    />
  );
}
