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
    const domainName = body.domain.trim().toLowerCase();
    await createDomain(
      {
        domain: domainName,
        pass: body.pass,
        user: body.user,
        plan: body.plan,
        parent: body.parent,
        alias: body.type === "alias",
        subdom: body.type === "sub",
      },
      session,
    );
    let created: Awaited<ReturnType<typeof listDomains>>[number] | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      const domains = await listDomains(session);
      created = domains.find((d) => d.name.toLowerCase() === domainName);
      if (created) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!created) {
      return jsonError(
        "VirtualMin did not list the new domain. Open Webmin (:10000) or run: virtualmin list-domains. Check postfix/hostname on the server.",
        502,
      );
    }
    await auditLog(session.username, "create-domain", domainName);
    return jsonOk({ ok: true, domain: created.name });
  } catch (err) {
    return handleApiError(err);
  }
}
