import { SslManager } from "@/components/SslManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listSslCerts } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function SslPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let certs: Awaited<ReturnType<typeof listSslCerts>> = [];
  let error = "";
  try {
    certs = await listSslCerts(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load certificates.";
  }
  return <SslManager domain={domain} initialCerts={certs} initialError={error} />;
}
