import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const user = new URL(request.url).searchParams.get("user") ?? undefined;
    const mailboxes = await getProvisioner().listImapMailboxes(domain, user, session);
    return jsonOk({ mailboxes });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may copy mailboxes.", 403);
    }
    const body = (await request.json()) as { from?: string; to?: string };
    if (!body.from || !body.to) {
      return jsonError("from and to are required.");
    }
    await getProvisioner().copyMailbox(domain, body.from, body.to, session);
    await auditLog(session.username, "copy-mailbox", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
