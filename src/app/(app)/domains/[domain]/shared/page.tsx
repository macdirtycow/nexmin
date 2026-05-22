import { SharedAddressesManager } from "@/components/SharedAddressesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function SharedPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let addresses: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listSharedAddresses"]>> = [];
  let error = "";
  try {
    addresses = await getProvisioner().listSharedAddresses(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load addresses.";
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
