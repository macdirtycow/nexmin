import { FeaturesManager } from "@/components/FeaturesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listDomainFeatures } from "@/lib/virtualmin";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function FeaturesPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  if (session.role !== "admin") redirect(`/domains/${encodeURIComponent(domain)}`);

  let features: Awaited<ReturnType<typeof listDomainFeatures>> = [];
  let error = "";
  try {
    features = await listDomainFeatures(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon features niet laden.";
  }
  return (
    <FeaturesManager
      domain={domain}
      initialFeatures={features}
      initialError={error}
    />
  );
}
