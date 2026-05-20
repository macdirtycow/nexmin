import { BackupsManager } from "@/components/BackupsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listScheduledBackups } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function BackupsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let scheduled: Awaited<ReturnType<typeof listScheduledBackups>> = [];
  let error = "";
  try {
    scheduled = await listScheduledBackups(domain, session);
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
