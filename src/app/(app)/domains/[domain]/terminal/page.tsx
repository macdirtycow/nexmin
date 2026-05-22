import { WebminEmbed } from "@/components/WebminEmbed";
import { DomainPageHeader } from "@/components/DomainPageHeader";
import { requireDomainAccess } from "@/lib/domain-api";
import { domainTerminalEmbedPath } from "@/lib/webmin-embed-url";
import { createVirtualMinLoginLink, resolveDomainUnixUser } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function DomainTerminalPage({ params }: Props) {
  const { domain, session } = await requireDomainAccess((await params).domain);
  const enc = encodeURIComponent(domain);

  let initialUrl: string | null = null;
  let initialError = "";
  try {
    const unixUser = await resolveDomainUnixUser(domain, session);
    initialUrl = await createVirtualMinLoginLink(domain, session, {
      redirectUrl: domainTerminalEmbedPath(unixUser),
      preferUsermin: false,
    });
  } catch (e) {
    initialError =
      e instanceof Error
        ? e.message
        : "Could not open terminal. Use Webmin → Terminal (xterm) or run Repair on Overview.";
  }

  return (
    <div className="space-y-6">
      <DomainPageHeader domain={domain} title="Terminal" />
      <WebminEmbed
        title="Domain shell"
        description="Webmin xterm session scoped to this virtual server."
        fetchUrl={`/api/domains/${enc}/virtualmin-link?dest=terminal`}
        initialUrl={initialUrl}
        initialError={initialError || undefined}
        height="min(75vh, 800px)"
      />
    </div>
  );
}
