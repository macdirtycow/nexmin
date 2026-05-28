import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";
import { runProvisioningHelper } from "@/lib/provisioner/native-exec";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const key = await requireApiV1("limits:read");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const limits = await getProvisioner().getDomainLimits(domain, apiV1Actor());
    return jsonOk({ domain, limits });
  } catch (err) {
    return apiV1Error(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const key = await requireApiV1("limits:write");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const body = (await request.json()) as {
      disk?: string;
      bandwidth?: string;
      mailboxes?: string;
      databases?: string;
      plan?: string;
    };
    if (body.plan?.trim()) {
      await runProvisioningHelper("plan-apply", domain, body.plan.trim());
    } else {
      await getProvisioner().updateDomainLimits(domain, body, apiV1Actor());
    }
    await auditLog(`api:${key.id}`, "api-v1-limits", domain, body.plan);
    const limits = await getProvisioner().getDomainLimits(domain, apiV1Actor());
    return jsonOk({ ok: true, limits });
  } catch (err) {
    return apiV1Error(err);
  }
}
