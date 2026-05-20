import { RedirectsManager } from "@/components/RedirectsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listRedirects } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function RedirectsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let redirects: Awaited<ReturnType<typeof listRedirects>> = [];
  let error = "";
  try {
    redirects = await listRedirects(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon redirects niet laden.";
  }
  return (
    <RedirectsManager
      domain={domain}
      initialRedirects={redirects}
      initialError={error}
    />
  );
}
