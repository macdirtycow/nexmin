import { FtpManager } from "@/components/FtpManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function FtpPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let accounts: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listFtpAccountsSafe"]>> = [];
  let error = "";
  try {
    accounts = await getProvisioner().listFtpAccountsSafe(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load FTP accounts.";
  }
  return (
    <FtpManager domain={domain} initialAccounts={accounts} initialError={error} />
  );
}
