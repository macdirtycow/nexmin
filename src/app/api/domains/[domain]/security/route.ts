import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const settings = await getProvisioner().getMailSecurity(domain, session);
    return jsonOk({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      spamEnabled?: boolean;
      dkimEnabled?: boolean;
    };
    if (body.spamEnabled !== undefined) {
      await getProvisioner().setSpamFilter(domain, body.spamEnabled, session);
      await auditLog(session.username, "set-spam", domain);
    }
    if (body.dkimEnabled !== undefined) {
      await getProvisioner().setDkim(domain, body.dkimEnabled, session);
      await auditLog(session.username, "set-dkim", domain);
    }
    if (body.spamEnabled === undefined && body.dkimEnabled === undefined) {
      return jsonError("Provide spamEnabled and/or dkimEnabled.");
    }
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
