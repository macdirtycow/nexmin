import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";
import type { DnsRecord } from "@/lib/hosting-remote";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const key = await requireApiV1("dns:read");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const dns = await getProvisioner().getDns(domain, apiV1Actor());
    return jsonOk({ domain, records: dns.records });
  } catch (err) {
    return apiV1Error(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const key = await requireApiV1("dns:write");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const body = (await request.json()) as {
      action?: string;
      record?: DnsRecord;
    };
    if (body.action === "delete" && body.record) {
      await getProvisioner().deleteDnsRecord(domain, body.record, apiV1Actor());
      await auditLog(`api:${key.id}`, "api-v1-dns-delete", domain);
      return jsonOk({ ok: true });
    }
    if (body.record) {
      await getProvisioner().addDnsRecord(domain, body.record, apiV1Actor());
      await auditLog(`api:${key.id}`, "api-v1-dns-add", domain);
      return jsonOk({ ok: true });
    }
    return apiV1Error(Object.assign(new Error("record required"), { status: 400 }));
  } catch (err) {
    return apiV1Error(err);
  }
}
