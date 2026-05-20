import { auditLog } from "@/lib/audit";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { setDomainEnabled } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    if (session.role !== "admin") {
      return handleApiError(new Error("Only administrators may enable or disable domains."));
    }
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    await setDomainEnabled(domain, false, session);
    await auditLog(session.username, "disable-domain", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
