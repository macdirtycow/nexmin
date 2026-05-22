import { DatabaseManager } from "@/components/DatabaseManager";
import { getSession } from "@/lib/session";
import { getProvisioner } from "@/lib/provisioner";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function DatabasesPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { domain: encoded } = await params;
  const domainName = decodeURIComponent(encoded);
  const domains = await getProvisioner().listDomains(session);
  if (!domains.some((d) => d.name.toLowerCase() === domainName.toLowerCase())) {
    notFound();
  }

  let databases: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listDatabases"]>> = [];
  let error = "";
  try {
    databases = await getProvisioner().listDatabases(domainName, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load databases.";
  }

  return (
    <DatabaseManager
      domain={domainName}
      initialDatabases={databases}
      initialError={error}
    />
  );
}
