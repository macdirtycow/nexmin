import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const proxies = await getProvisioner().listProxies(domain, session);
    return jsonOk({ proxies });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may create proxies.", 403);
    }
    const body = (await request.json()) as { path?: string; dest?: string };
    if (!body.path || !body.dest) {
      return jsonError("Path and destination are required.");
    }
    await getProvisioner().createProxy(domain, body.path, body.dest, session);
    await auditLog(session.username, "create-proxy", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may delete proxies.", 403);
    }
    const body = (await request.json()) as { path?: string };
    if (!body.path) return jsonError("Path is required.");
    await getProvisioner().deleteProxy(domain, body.path, session);
    await auditLog(session.username, "delete-proxy", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
