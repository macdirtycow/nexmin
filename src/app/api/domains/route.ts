import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { createDomain, listDomains } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireSession();
    const domains = await listDomains(session);
    await auditLog(session.username, "list-domains");
    return jsonOk({ domains });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as {
      domain?: string;
      pass?: string;
      user?: string;
      plan?: string;
      parent?: string;
      type?: "top" | "sub" | "alias";
    };
    if (!body.domain || !body.pass) {
      return jsonError("Domain name and password are required.");
    }
    await createDomain(
      {
        domain: body.domain,
        pass: body.pass,
        user: body.user,
        plan: body.plan,
        parent: body.parent,
        alias: body.type === "alias",
        subdom: body.type === "sub",
      },
      session,
    );
    await auditLog(session.username, "create-domain", body.domain);
    return jsonOk({ ok: true, domain: body.domain });
  } catch (err) {
    return handleApiError(err);
  }
}
