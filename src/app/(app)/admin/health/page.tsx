import { requireAdminPage } from "@/lib/admin-api";
import { HealthBrowser } from "@/components/admin/HealthBrowser";

export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  await requireAdminPage();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">
          Self-healing · what does Qadbak see?
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-panel-muted">
          Continuously-evaluated checks that flag the most common Linux
          problems (full disks, expiring certs, dead services, swapping
          RAM) in plain English. Every finding includes the evidence we
          based it on, why it matters, and a copy-paste command to fix it.
        </p>
      </header>
      <HealthBrowser />
    </div>
  );
}
