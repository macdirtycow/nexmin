import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { copyMailbox, listImapMailboxes } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const user = new URL(request.url).searchParams.get("user") ?? undefined;
    const mailboxes = await listImapMailboxes(domain, user, session);
    return jsonOk({ mailboxes });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders mogen mailboxen kopiëren.", 403);
    }
    const body = (await request.json()) as { from?: string; to?: string };
    if (!body.from || !body.to) {
      return jsonError("from en to zijn verplicht.");
    }
    await copyMailbox(domain, body.from, body.to, session);
    await auditLog(session.username, "copy-mailbox", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
