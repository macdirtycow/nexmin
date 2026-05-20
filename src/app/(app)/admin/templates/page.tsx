import { Alert, Card } from "@/components/ui";
import { requireAdminPage } from "@/lib/admin-api";
import { listTemplates } from "@/lib/virtualmin";

export default async function AdminTemplatesPage() {
  const session = await requireAdminPage();
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  let error = "";
  try {
    templates = await listTemplates(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon templates niet laden.";
  }
  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Card className="overflow-hidden p-0">
        <p className="px-6 pt-6 text-sm text-panel-muted">
          Server templates (alleen bekijken). Wijzigingen via VirtualMin.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-t border-panel-border text-panel-muted">
            <tr>
              <th className="px-6 py-3">Naam</th>
              <th className="px-6 py-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.name} className="border-t border-panel-border/50">
                <td className="px-6 py-3 text-white">{t.name}</td>
                <td className="px-6 py-3">{t.id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {templates.length === 0 && !error && (
          <p className="px-6 py-8 text-center text-panel-muted">Geen templates.</p>
        )}
      </Card>
    </div>
  );
}
