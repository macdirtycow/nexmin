import { DnsManager } from "@/components/DnsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getDns } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function DnsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let records: Awaited<ReturnType<typeof getDns>>["records"] = [];
  let error = "";
  try {
    const result = await getDns(domain, session);
    records = result.records;
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon DNS niet laden.";
  }
  return <DnsManager domain={domain} initialRecords={records} initialError={error} />;
}
