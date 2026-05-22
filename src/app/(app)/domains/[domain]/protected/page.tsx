import { ProtectedManager } from "@/components/ProtectedManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function ProtectedPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let directories: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listProtectedDirectories"]>> = [];
  let error = "";
  try {
    directories = await getProvisioner().listProtectedDirectories(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load directories.";
  }
  return (
    <ProtectedManager
      domain={domain}
      initialDirectories={directories}
      initialError={error}
    />
  );
}
