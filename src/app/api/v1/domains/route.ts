import { randomBytes } from "crypto";
import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

function apiActor() {
  return { role: "admin" as const, domains: [] as string[] };
}

export async function GET() {
  try {
    const key = await requireApiV1("domains:read");
    let domains = await getProvisioner().listDomains(apiActor());
    if (key.resellerId) {
      domains = domains.filter(
        (d) =>
          (d as { reseller?: string }).reseller === key.resellerId ||
          (d as { parent?: string }).parent === key.resellerId,
      );
    }
    return jsonOk({ domains });
  } catch (err) {
    return apiV1Error(err);
  }
}

export async function POST(request: Request) {
  try {
    const key = await requireApiV1("domains:write");
    const body = (await request.json()) as {
      domain?: string;
      user?: string;
      plan?: string;
      pass?: string;
      limits?: {
        disk?: string;
        bandwidth?: string;
        mailboxes?: string;
        databases?: string;
      };
    };
    if (!body.domain?.trim()) {
      return apiV1Error(Object.assign(new Error("domain required"), { status: 400 }));
    }
    const pass = body.pass?.trim() || randomBytes(12).toString("base64url");
    const domainName = body.domain.trim().toLowerCase();
    await getProvisioner().createDomain(
      {
        domain: domainName,
        pass,
        user: body.user?.trim(),
        plan: body.plan,
      },
      apiActor(),
    );
    if (body.limits) {
      await getProvisioner().updateDomainLimits(domainName, body.limits, apiActor());
    }
    await auditLog(`api:${key.id}`, "api-v1-create-domain", domainName);
    return jsonOk({ ok: true, domain: domainName, plan: body.plan });
  } catch (err) {
    return apiV1Error(err);
  }
}
