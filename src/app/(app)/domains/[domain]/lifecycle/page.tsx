import { LifecycleManager } from "@/components/LifecycleManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { validateDomain } from "@/lib/virtualmin";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function LifecyclePage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  if (session.role !== "admin") redirect(`/domains/${encodeURIComponent(domain)}`);

  let validation: Awaited<ReturnType<typeof validateDomain>> = {
    valid: true,
    messages: [],
  };
  let error = "";
  try {
    validation = await validateDomain(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon validatie niet laden.";
  }
  return (
    <LifecycleManager
      domain={domain}
      initialValidation={validation}
      initialError={error}
    />
  );
}
