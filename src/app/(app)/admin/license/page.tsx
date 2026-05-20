import { Alert, Card } from "@/components/ui";
import { requireAdminPage } from "@/lib/admin-api";
import { getLicenseInfo } from "@/lib/virtualmin";

export default async function AdminLicensePage() {
  const session = await requireAdminPage();
  let license: Record<string, string> = {};
  let error = "";
  try {
    license = await getLicenseInfo(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon licentie niet laden.";
  }
  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Card>
        <h2 className="text-lg font-medium text-white">VirtualMin-licentie</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-panel-muted">Type</dt>
            <dd className="text-white">{license.type ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-panel-muted">Domeinen</dt>
            <dd className="text-white">{license.domains ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-panel-muted">Vervaldatum</dt>
            <dd className="text-white">{license.expiry ?? "—"}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-panel-muted">
          Repository-setup (`setup-repos`) voer je uit in VirtualMin of via de CLI.
        </p>
      </Card>
    </div>
  );
}
