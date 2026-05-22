import { LimitsManager } from "@/components/LimitsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function LimitsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  if (session.role !== "admin") redirect(`/domains/${encodeURIComponent(domain)}`);

  let limits: Awaited<ReturnType<ReturnType<typeof getProvisioner>["getDomainLimits"]>> = {};
  let error = "";
  try {
    limits = await getProvisioner().getDomainLimits(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load limits.";
  }
  return (
    <LimitsManager domain={domain} initialLimits={limits} initialError={error} />
  );
}
