import { MailLogsManager } from "@/components/MailLogsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function MailLogsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let lines: string[] = [];
  let error = "";
  try {
    lines = await getProvisioner().searchMailLogs(domain, "", session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load logs.";
  }
  return (
    <MailLogsManager
      domain={domain}
      initialLines={lines}
      initialError={error}
      isAdmin={session.role === "admin"}
    />
  );
}
