import { Card } from "@/components/ui";
import { ADMIN_NAV } from "@/lib/features";
import Link from "next/link";

export default function AdminOverviewPage() {
  const items = ADMIN_NAV.filter((n) => n.path !== "/admin");
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link key={item.path} href={item.path}>
          <Card className="transition hover:border-panel-accent">
            <h2 className="font-medium text-white">{item.label}</h2>
            <p className="mt-1 text-sm text-panel-muted">Beheer →</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
