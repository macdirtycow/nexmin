import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

/** @deprecated Use /domains/[domain]/mail/imap */
export default async function MailboxesRedirectPage({ params }: Props) {
  const { domain: encoded } = await params;
  const domain = decodeURIComponent(encoded);
  redirect(`/domains/${encodeURIComponent(domain)}/mail/imap`);
}
