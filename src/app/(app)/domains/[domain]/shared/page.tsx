import { SharedAddressesManager } from "@/components/SharedAddressesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listSharedAddresses } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function SharedPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let addresses: Awaited<ReturnType<typeof listSharedAddresses>> = [];
  let error = "";
  try {
    addresses = await listSharedAddresses(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon adressen niet laden.";
  }
  return (
    <SharedAddressesManager
      domain={domain}
      initialAddresses={addresses}
      isAdmin={session.role === "admin"}
      initialError={error}
    />
  );
}
