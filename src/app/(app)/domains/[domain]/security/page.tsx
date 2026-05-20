import { SecurityManager } from "@/components/SecurityManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getMailSecurity } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function SecurityPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let settings: Awaited<ReturnType<typeof getMailSecurity>> = {};
  let error = "";
  try {
    settings = await getMailSecurity(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon instellingen niet laden.";
  }
  return (
    <SecurityManager
      domain={domain}
      initialSettings={settings}
      initialError={error}
    />
  );
}
