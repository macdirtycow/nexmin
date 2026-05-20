import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { listSslCerts, requestLetsEncrypt } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const certs = await listSslCerts(domain, session);
    return jsonOk({ certs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { host?: string };
    await requestLetsEncrypt(domain, body.host ?? domain, session);
    await auditLog(session.username, "generate-letsencrypt-cert", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
