import { PhpManager } from "@/components/PhpManager";
import { requireDomainAccess } from "@/lib/domain-api";
import {
  listPhpDirectories,
  listPhpIni,
  listPhpVersions,
} from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function PhpPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let error = "";
  let versions: Awaited<ReturnType<typeof listPhpVersions>> = [];
  let directories: Awaited<ReturnType<typeof listPhpDirectories>> = [];
  let ini: Awaited<ReturnType<typeof listPhpIni>> = [];
  try {
    [versions, directories, ini] = await Promise.all([
      listPhpVersions(domain, session),
      listPhpDirectories(domain, session),
      listPhpIni(domain, undefined, session),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon PHP-gegevens niet laden.";
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
