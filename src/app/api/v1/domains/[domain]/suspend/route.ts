import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const key = await requireApiV1("domains:write");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const body = (await request.json()) as { enabled?: boolean };
    const enabled = body.enabled !== false;
    await getProvisioner().setDomainEnabled(domain, enabled, apiV1Actor());
    await auditLog(`api:${key.id}`, enabled ? "api-v1-enable-domain" : "api-v1-suspend-domain", domain);
    return jsonOk({ ok: true, domain, enabled });
  } catch (err) {
    return apiV1Error(err);
  }
}
