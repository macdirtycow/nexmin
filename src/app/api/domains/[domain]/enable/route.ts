import { auditLog } from "@/lib/audit";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { session, domain } = await requireDomainApi((await params).domain);
    await getProvisioner().setDomainEnabled(domain, true, session);
    await auditLog(session.username, "enable-domain", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
