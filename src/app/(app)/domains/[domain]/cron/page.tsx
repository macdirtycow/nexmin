import { CronManager } from "@/components/CronManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Props = { params: Promise<{ domain: string }> };

export default async function CronPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let jobs: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listCronJobsWithFallback"]>> = [];
  let error = "";
  try {
    jobs = await getProvisioner().listCronJobsWithFallback(domain, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load cron jobs.";
  }
  return (
    <CronManager
      domain={domain}
      initialJobs={jobs}
      canEdit={session.role === "admin"}
      initialError={error}
    />
  );
}
