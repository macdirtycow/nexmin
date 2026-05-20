import { DatabaseManager } from "@/components/DatabaseManager";
import { getSession } from "@/lib/session";
import { listDatabases, listDomains } from "@/lib/virtualmin";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function DatabasesPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { domain: encoded } = await params;
  const domainName = decodeURIComponent(encoded);
  const domains = await listDomains(session);
  if (!domains.some((d) => d.name.toLowerCase() === domainName.toLowerCase())) {
    notFound();
  }

  let databases: Awaited<ReturnType<typeof listDatabases>> = [];
  let error = "";
  try {
    databases = await listDatabases(domainName, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Kon databases niet laden.";
  }

  return (
    <DatabaseManager
      domain={domainName}
      initialDatabases={databases}
      initialError={error}
    />
  );
}
