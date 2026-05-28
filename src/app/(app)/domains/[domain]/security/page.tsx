import { SecurityManager } from "@/components/SecurityManager";
import { requireDomainAccess } from "@/lib/domain-api";

type Props = { params: Promise<{ domain: string }> };

export default async function SecurityPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  return (
    <SecurityManager
      domain={domain}
      initialError=""
      isAdmin={session.role === "admin"}
    />
  );
}
