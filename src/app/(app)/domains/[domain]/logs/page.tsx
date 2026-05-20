import { LogsManager } from "@/components/LogsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getWebsiteLogs } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function LogsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let log = "";
  let error = "";
  try {
    log = await getWebsiteLogs(domain, "access", session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon logs niet laden.";
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
