import { PhpManager } from "@/components/PhpManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function PhpPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let error = "";
  let versions: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listPhpVersions"]>> = [];
  let directories: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listPhpDirectories"]>> = [];
  let ini: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listPhpIni"]>> = [];
  try {
    [versions, directories, ini] = await Promise.all([
      getProvisioner().listPhpVersions(domain, session),
      getProvisioner().listPhpDirectories(domain, session),
      getProvisioner().listPhpIni(domain, undefined, session),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load PHP data.";
  }
  return (
    <PhpManager
      domain={domain}
      initialVersions={versions}
      initialDirectories={directories}
      initialIni={ini}
      isAdmin={session.role === "admin"}
      initialError={error}
    />
  );
}
