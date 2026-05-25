import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-api";
import { listTemplates } from "@/lib/apps";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminAppsPage() {
  await requireAdminPage();
  const templates = listTemplates();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">
          Apps · install intents, not commands
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-panel-muted">
          Tell Qadbak what you want to host. It picks the domain, creates
          the database, lays down the code and writes the config in one
          journaled operation — instead of you clicking through ten
          separate primitives.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Link key={t.id} href={`/admin/apps/${encodeURIComponent(t.id)}/install`}>
            <Card className="h-full transition hover:border-panel-accent">
              <div className="text-3xl">{t.icon}</div>
              <h2 className="mt-3 text-lg font-medium text-white">{t.label}</h2>
              <p className="mt-1 text-sm text-panel-muted">{t.tagline}</p>
              {t.etaSeconds ? (
                <p className="mt-3 text-xs uppercase tracking-wide text-panel-muted/70">
                  ~{Math.ceil(t.etaSeconds / 60)} min install
                </p>
              ) : null}
            </Card>
          </Link>
        ))}
        {templates.length === 0 ? (
          <p className="text-sm text-panel-muted">
            No app templates available yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
