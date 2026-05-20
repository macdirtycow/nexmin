import { LimitsManager } from "@/components/LimitsManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getDomainLimits } from "@/lib/virtualmin";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function LimitsPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  if (session.role !== "admin") redirect(`/domains/${encodeURIComponent(domain)}`);

  let limits: Awaited<ReturnType<typeof getDomainLimits>> = {};
  let error = "";
  try {
    limits = await getDomainLimits(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load limits.";
  }
  return (
    <LimitsManager domain={domain} initialLimits={limits} initialError={error} />
  );
}
