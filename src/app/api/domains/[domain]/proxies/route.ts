import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { createProxy, deleteProxy, listProxies } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const proxies = await listProxies(domain, session);
    return jsonOk({ proxies });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders mogen proxies aanmaken.", 403);
    }
    const body = (await request.json()) as { path?: string; dest?: string };
    if (!body.path || !body.dest) {
      return jsonError("Pad en bestemming zijn verplicht.");
    }
    await createProxy(domain, body.path, body.dest, session);
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
      return jsonError("Alleen beheerders mogen proxies verwijderen.", 403);
    }
    const body = (await request.json()) as { path?: string };
    if (!body.path) return jsonError("Pad is verplicht.");
    await deleteProxy(domain, body.path, session);
    await auditLog(session.username, "delete-proxy", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
