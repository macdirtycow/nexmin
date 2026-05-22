import { BackupsManager } from "@/components/BackupsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function BackupsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let scheduled: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listScheduledBackups"]>> = [];
  let error = "";
  try {
    scheduled = await getProvisioner().listScheduledBackups(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load backups.";
  }
  return (
    <BackupsManager
      domain={domain}
      initialScheduled={scheduled}
      canBackup={session.role === "admin"}
      canRestore={session.role === "admin"}
      initialError={error}
    />
  );
}
