import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const [available, installed] = await Promise.all([
      getProvisioner().listAvailableScripts(domain, session),
      getProvisioner().listInstalledScripts(domain, session),
    ]);
    return jsonOk({ available, installed });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may install scripts.", 403);
    }
    const body = (await request.json()) as { script?: string; path?: string };
    if (!body.script) return jsonError("Script name is required.");
    await getProvisioner().installScript(domain, body.script, body.path, session);
    await auditLog(session.username, "install-script", domain, body.script);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may delete scripts.", 403);
    }
    const body = (await request.json()) as { script?: string };
    if (!body.script) return jsonError("Script name is required.");
    await getProvisioner().deleteInstalledScript(domain, body.script, session);
    await auditLog(session.username, "delete-script", domain, body.script);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
