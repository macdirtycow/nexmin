import { ProxiesManager } from "@/components/ProxiesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listProxies } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function ProxiesPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let proxies: Awaited<ReturnType<typeof listProxies>> = [];
  let error = "";
  try {
    proxies = await listProxies(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load proxies.";
  }
  return (
    <ProxiesManager
      domain={domain}
      initialProxies={proxies}
      isAdmin={session.role === "admin"}
      initialError={error}
    />
  );
}
