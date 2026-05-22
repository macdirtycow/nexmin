import { SecurityManager } from "@/components/SecurityManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function SecurityPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let settings: Awaited<ReturnType<ReturnType<typeof getProvisioner>["getMailSecurity"]>> = {};
  let error = "";
  try {
    settings = await getProvisioner().getMailSecurity(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load settings.";
  }
  return (
    <SecurityManager
      domain={domain}
      initialSettings={settings}
      initialError={error}
    />
  );
}
