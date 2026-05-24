import { AdminUpdatesView } from "@/components/AdminUpdatesView";
import { requireAdminPage } from "@/lib/admin-api";

export default async function AdminUpdatesPage() {
  await requireAdminPage();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Updates</h2>
        <p className="mt-1 text-sm text-panel-muted">
          Linux package upgrades and Qadbak git updates — without SSH.
        </p>
      </div>
      <AdminUpdatesView />
    </div>
  );
}
