import { FeaturesManager } from "@/components/FeaturesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function FeaturesPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  if (session.role !== "admin") redirect(`/domains/${encodeURIComponent(domain)}`);

  let features: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listDomainFeatures"]>> = [];
  let error = "";
  try {
    features = await getProvisioner().listDomainFeatures(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load features.";
  }
  return (
    <FeaturesManager
      domain={domain}
      initialFeatures={features}
      initialError={error}
    />
  );
}
