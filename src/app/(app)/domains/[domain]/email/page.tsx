import { redirect } from "next/navigation";

type Props = { params: Promise<{ domain: string }> };

/** @deprecated Use /domains/[domain]/mail/accounts */
export default async function EmailRedirectPage({ params }: Props) {
  const { domain: encoded } = await params;
  const domain = decodeURIComponent(encoded);
  redirect(`/domains/${encodeURIComponent(domain)}/mail/accounts`);
}
