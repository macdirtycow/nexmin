import { ImapMailboxesManager } from "@/components/ImapMailboxesManager";
import { requireDomainAccess } from "@/lib/domain-api";
import { listImapMailboxes } from "@/lib/virtualmin";

type Props = { params: Promise<{ domain: string }> };

export default async function MailboxesPage({ params }: Props) {
  const { session, domain } = await requireDomainAccess((await params).domain);
  let mailboxes: Awaited<ReturnType<typeof listImapMailboxes>> = [];
  let error = "";
  try {
    mailboxes = await listImapMailboxes(domain, "info", session);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not load mailboxes.";
  }
  return (
    <ImapMailboxesManager
      domain={domain}
      initialMailboxes={mailboxes}
      initialError={error}
      isAdmin={session.role === "admin"}
    />
  );
}
