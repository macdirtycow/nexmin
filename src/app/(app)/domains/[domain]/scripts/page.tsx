import { ScriptsManager } from "@/components/ScriptsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function ScriptsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let available: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listAvailableScripts"]>> = [];
  let installed: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listInstalledScripts"]>> = [];
  let error = "";
  try {
    [available, installed] = await Promise.all([
      getProvisioner().listAvailableScripts(domain, session),
      getProvisioner().listInstalledScripts(domain, session),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load scripts.";
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
