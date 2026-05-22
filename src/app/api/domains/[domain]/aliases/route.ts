import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const aliases = await getProvisioner().listAliases(domain, session);
    return jsonOk({ aliases });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { from?: string; to?: string };
    if (!body.from || !body.to) {
      return jsonError("From and to are required.");
    }
    await getProvisioner().createAlias(domain, body.from, body.to, session);
    await auditLog(session.username, "create-simple-alias", domain, body.from);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { from?: string };
    if (!body.from) return jsonError("Alias (from) is required.");
    await getProvisioner().deleteAlias(domain, body.from, session);
    await auditLog(session.username, "delete-alias", domain, body.from);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
