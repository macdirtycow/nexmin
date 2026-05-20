import { CreateDomainForm } from "@/components/CreateDomainForm";
import { getSession } from "@/lib/session";
import { listDomains } from "@/lib/virtualmin";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewDomainPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/domains");

  const domains = await listDomains(session);
  const parentOptions = domains.map((d) => d.name);

  return (
    <div className="space-y-6">
      <p className="text-sm text-panel-muted">
        <Link href="/domains" className="hover:text-white">
          ← Domains
        </Link>
      </p>
      <CreateDomainForm parentOptions={parentOptions} />
    </div>
  );
}
