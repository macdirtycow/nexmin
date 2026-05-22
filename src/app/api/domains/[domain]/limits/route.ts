import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Administrators only.", 403);
    }
    const limits = await getProvisioner().getDomainLimits(domain, session);
    return jsonOk({ limits });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Administrators only.", 403);
    }
    const body = (await request.json()) as {
      disk?: string;
      bandwidth?: string;
      mailboxes?: string;
      databases?: string;
    };
    await getProvisioner().updateDomainLimits(domain, body, session);
    await auditLog(session.username, "modify-limits", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
