import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const redirects = await getProvisioner().listRedirects(domain, session);
    return jsonOk({ redirects });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      path?: string;
      dest?: string;
      type?: string;
    };
    if (!body.path || !body.dest) {
      return jsonError("Path and destination are required.");
    }
    await getProvisioner().createRedirect(domain, body.path, body.dest, body.type ?? "301", session);
    await auditLog(session.username, "create-redirect", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { path?: string };
    if (!body.path) return jsonError("Path is required.");
    await getProvisioner().deleteRedirect(domain, body.path, session);
    await auditLog(session.username, "delete-redirect", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
