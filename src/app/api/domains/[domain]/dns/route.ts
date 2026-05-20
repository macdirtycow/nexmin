import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { addDnsRecord, getDns } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const result = await getDns(domain, session);
    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      name?: string;
      type?: string;
      value?: string;
      ttl?: string;
      priority?: string;
    };
    if (!body.name || !body.type || !body.value) {
      return jsonError("Name, type, and value are required.");
    }
    await addDnsRecord(
      domain,
      {
        name: body.name,
        type: body.type,
        value: body.value,
        ttl: body.ttl,
        priority: body.priority,
      },
      session,
    );
    await auditLog(session.username, "modify-dns", domain, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
