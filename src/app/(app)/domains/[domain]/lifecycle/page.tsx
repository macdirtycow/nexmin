import { LifecycleManager } from "@/components/LifecycleManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { isIndependentMode } from "@/lib/provisioner/native-stub";
import { getProvisioner } from "@/lib/provisioner";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function LifecyclePage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  if (session.role !== "admin") redirect(`/domains/${encodeURIComponent(domain)}`);

  let validation: Awaited<ReturnType<ReturnType<typeof getProvisioner>["validateDomain"]>> = {
    valid: true,
    messages: [],
  };
  let error = "";
  try {
    validation = await getProvisioner().validateDomain(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load validation.";
  }
  return (
    <LifecycleManager
      domain={domain}
      initialValidation={validation}
      initialError={error}
      independentMode={isIndependentMode()}
    />
  );
}
