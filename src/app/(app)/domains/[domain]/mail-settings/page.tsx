import { MailSettingsManager } from "@/components/MailSettingsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function MailSettingsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let settings: Awaited<ReturnType<ReturnType<typeof getProvisioner>["getMailSettings"]>> = {};
  let error = "";
  try {
    settings = await getProvisioner().getMailSettings(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load settings.";
  }
  return (
    <MailSettingsManager
      domain={domain}
      initialSettings={settings}
      initialError={error}
    />
  );
}
