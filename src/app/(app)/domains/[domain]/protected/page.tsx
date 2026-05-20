import { ProtectedManager } from "@/components/ProtectedManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listProtectedDirectories } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function ProtectedPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let directories: Awaited<ReturnType<typeof listProtectedDirectories>> = [];
  let error = "";
  try {
    directories = await listProtectedDirectories(domain, session);
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
