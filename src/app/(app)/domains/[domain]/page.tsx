import { DomainDetail } from "@/components/DomainDetail";
import { getSession } from "@/lib/session";
import { isDomainDisabled } from "@/lib/domain-utils";
import { listDomains } from "@/lib/virtualmin";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function DomainDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { domain: encoded } = await params;
  const domainName = decodeURIComponent(encoded);
  const domains = await listDomains(session);
  const domain = domains.find(
    (d) => d.name.toLowerCase() === domainName.toLowerCase(),
  );
  if (!domain) notFound();

  return (
    <>
      <DomainDetail
        domain={domain}
        disabled={isDomainDisabled(domain)}
        isAdmin={session.role === "admin"}
      />
    </>
  );
}
