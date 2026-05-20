import { EmailManager } from "@/components/EmailManager";
import { getSession } from "@/lib/session";
import { listDomains, listMailboxes } from "@/lib/virtualmin";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

export default async function EmailPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  const { domain: encoded } = await params;
  const domainName = decodeURIComponent(encoded);
  const domains = await listDomains(session);
  if (!domains.some((d) => d.name.toLowerCase() === domainName.toLowerCase())) {
    notFound();
  }

  let users: Awaited<ReturnType<typeof listMailboxes>> = [];
  let error = "";
  try {
    users = await listMailboxes(domainName, session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load mailboxes.";
  }

  return (
    <EmailManager domain={domainName} initialUsers={users} initialError={error} />
  );
}
