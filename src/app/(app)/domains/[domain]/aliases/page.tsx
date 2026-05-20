import { AliasesManager } from "@/components/AliasesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listAliases } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function AliasesPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let aliases: Awaited<ReturnType<typeof listAliases>> = [];
  let error = "";
  try {
    aliases = await listAliases(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load aliases.";
  }
  return (
    <AliasesManager domain={domain} initialAliases={aliases} initialError={error} />
  );
}
