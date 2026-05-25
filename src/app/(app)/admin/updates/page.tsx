import { AdminUpdatesView } from "@/components/AdminUpdatesView";
import { requireAdminPage } from "@/lib/admin-api";
import { PremiumSyncModulesCard } from "@/lib/premium/sync-card";
import { PremiumUpgradeCard } from "@/lib/premium/stubs";
import {
  getActivePremiumState,
  isPremiumFeatureEnabled,
  isPremiumModulesSynced,
} from "@/lib/premium/server";
import { isPremiumActive, readStoredLicense } from "@/lib/qadbak-license";

export default async function AdminUpdatesPage() {
  await requireAdminPage();
  const licensed = await isPremiumActive();
  const premium = await isPremiumFeatureEnabled("admin-updates");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Updates</h2>
        <p className="mt-1 text-sm text-panel-muted">
          Linux package upgrades and Qadbak git updates — without SSH.
        </p>
      </div>
      {premium ? (
        <AdminUpdatesView />
      ) : licensed ? (
        // License is active. We're locked because either (a) the Premium
        // tarball was never downloaded, or (b) an older synced bundle is
        // missing admin-updates in its active.features. Both are fixed by
        // hitting Refresh modules on the License page.
        <PremiumSyncModulesCard
          feature="admin-updates"
          title="Admin updates — refresh Premium modules"
          synced={await isPremiumModulesSynced()}
          activeFeatures={(await getActivePremiumState())?.features ?? []}
          licensedFeatures={(await readStoredLicense())?.features ?? []}
        />
      ) : (
        <PremiumUpgradeCard
          feature="admin-updates"
          title="Admin updates (Premium)"
        />
      )}
    </div>
  );
}
