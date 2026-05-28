import { randomBytes } from "crypto";
import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const key = await requireApiV1("mail:read");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const mailboxes = await getProvisioner().listMailboxes(domain, apiV1Actor());
    return jsonOk({ domain, mailboxes });
  } catch (err) {
    return apiV1Error(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const key = await requireApiV1("mail:write");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const body = (await request.json()) as {
      user?: string;
      pass?: string;
      real?: string;
    };
    if (!body.user?.trim()) {
      return apiV1Error(Object.assign(new Error("user required"), { status: 400 }));
    }
    const pass = body.pass?.trim() || randomBytes(10).toString("base64url");
    await getProvisioner().createMailbox(
      domain,
      body.user.trim(),
      pass,
      body.real?.trim(),
      apiV1Actor(),
    );
    await auditLog(`api:${key.id}`, "api-v1-mail-create", domain, body.user);
    return jsonOk({ ok: true, user: body.user.trim(), pass });
  } catch (err) {
    return apiV1Error(err);
  }
}
