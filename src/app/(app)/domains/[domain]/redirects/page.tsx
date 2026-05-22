import { RedirectsManager } from "@/components/RedirectsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function RedirectsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let redirects: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listRedirects"]>> = [];
  let error = "";
  try {
    redirects = await getProvisioner().listRedirects(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load redirects.";
  }
  return (
    <RedirectsManager
      domain={domain}
      initialRedirects={redirects}
      initialError={error}
    />
  );
}
