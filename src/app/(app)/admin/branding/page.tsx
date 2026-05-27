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
        brandName: b.brandName,
        tagline: b.tagline,
        primaryColor: b.primaryColor,
        accentColor: b.accentColor,
        backgroundColor: b.backgroundColor,
        cardColor: b.cardColor,
        borderColor: b.borderColor,
        mutedColor: b.mutedColor,
        textColor: b.textColor,
        logoUrl: logoPublicPath(b.hasLogo),
        isCustom: b.isCustom,
      }}
    />
  );
}
