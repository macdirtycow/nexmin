import { ScriptsManager } from "@/components/ScriptsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listAvailableScripts, listInstalledScripts } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function ScriptsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let available: Awaited<ReturnType<typeof listAvailableScripts>> = [];
  let installed: Awaited<ReturnType<typeof listInstalledScripts>> = [];
  let error = "";
  try {
    [available, installed] = await Promise.all([
      listAvailableScripts(domain, session),
      listInstalledScripts(domain, session),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon scripts niet laden.";
  }
  return (
    <ScriptsManager
      domain={domain}
      initialAvailable={available}
      initialInstalled={installed}
      isAdmin={session.role === "admin"}
      initialError={error}
    />
  );
}
