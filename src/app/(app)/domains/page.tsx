import { DomainsList } from "@/components/DomainsList";
import { Button } from "@/components/ui";
import { getSession } from "@/lib/session";
import { getProvisioner } from "@/lib/provisioner";
import Link from "next/link";

export default async function DomainsPage() {
  const session = await getSession();
  if (!session) return null;

  let domains: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listDomains"]>> = [];
  let error = "";
  try {
    domains = await getProvisioner().listDomains(session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load domains.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Domains</h1>
          <p className="mt-1 text-panel-muted">
            Virtual servers on this machine
          </p>
        </div>
        {session.role === "admin" && (
          <Link href="/domains/new">
            <Button>New domain</Button>
          </Link>
        )}
      </div>
      <DomainsList
        initialDomains={domains}
        initialError={error}
        isAdmin={session.role === "admin"}
      />
    </div>
  );
}
