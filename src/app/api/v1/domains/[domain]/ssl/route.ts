import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const key = await requireApiV1("ssl:read");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const certs = await getProvisioner().listSslCerts(domain, apiV1Actor());
    return jsonOk({ domain, certs });
  } catch (err) {
    return apiV1Error(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const key = await requireApiV1("ssl:write");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const body = (await request.json()) as { host?: string };
    const host = body.host?.trim() || domain;
    await getProvisioner().requestLetsEncrypt(domain, host, apiV1Actor());
    await auditLog(`api:${key.id}`, "api-v1-ssl-issue", domain, host);
    return jsonOk({ ok: true, host });
  } catch (err) {
    return apiV1Error(err);
  }
}
