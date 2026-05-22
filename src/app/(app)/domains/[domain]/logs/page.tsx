import { LogsManager } from "@/components/LogsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function LogsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let log = "";
  let error = "";
  try {
    log = await getProvisioner().getWebsiteLogs(domain, "access", session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load logs.";
  }
  return (
    <LogsManager
      domain={domain}
      initialLog={log}
      initialType="access"
      initialError={error}
    />
  );
}
