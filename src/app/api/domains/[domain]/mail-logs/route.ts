import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { resendEmail, searchMailLogs } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const lines = await searchMailLogs(domain, query, session);
    return jsonOk({ lines });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders.", 403);
    }
    const body = (await request.json()) as { messageId?: string };
    if (!body.messageId) return jsonError("messageId is verplicht.");
    await resendEmail(domain, body.messageId, session);
    await auditLog(session.username, "resend-email", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
