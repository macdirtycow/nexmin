import { EmailManager } from "@/components/EmailManager";
import { getSession } from "@/lib/session";
import { getProvisioner } from "@/lib/provisioner";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function EmailPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { domain: encoded } = await params;
  const domainName = decodeURIComponent(encoded);
  const domains = await getProvisioner().listDomains(session);
  if (!domains.some((d) => d.name.toLowerCase() === domainName.toLowerCase())) {
    notFound();
  }

  let users: Awaited<ReturnType<ReturnType<typeof getProvisioner>["listMailboxes"]>> = [];
  let error = "";
  try {
    users = await getProvisioner().listMailboxes(domainName, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load mailboxes.";
  }

  return (
    <EmailManager domain={domainName} initialUsers={users} initialError={error} />
  );
}
