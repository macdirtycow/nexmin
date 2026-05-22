import { auditLog } from "@/lib/audit";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const url = new URL(request.url);
    const type = url.searchParams.get("type") === "error" ? "error" : "access";
    const log = await getProvisioner().getWebsiteLogs(domain, type, session);
    await auditLog(session.username, "get-logs", domain, type);
    return jsonOk({ log, type });
  } catch (err) {
    return handleApiError(err);
  }
}
