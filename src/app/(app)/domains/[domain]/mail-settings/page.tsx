import { MailSettingsManager } from "@/components/MailSettingsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getMailSettings } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function MailSettingsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let settings: Awaited<ReturnType<typeof getMailSettings>> = {};
  let error = "";
  try {
    settings = await getMailSettings(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon instellingen niet laden.";
  }
  return (
    <MailSettingsManager
      domain={domain}
      initialSettings={settings}
      initialError={error}
    />
  );
}
