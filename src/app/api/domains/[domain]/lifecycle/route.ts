import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  cloneDomain,
  deleteDomain,
  migrateDomain,
  transferDomain,
  validateDomain,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders.", 403);
    }
    const validation = await validateDomain(domain, session);
    return jsonOk({ validation });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders.", 403);
    }
    const body = (await request.json()) as {
      action?: string;
      newDomain?: string;
      destHost?: string;
      newOwner?: string;
      confirm?: string;
    };
    if (body.confirm !== domain) {
      return jsonError("Bevestiging komt niet overeen met domeinnaam.");
    }

    switch (body.action) {
      case "delete":
        await deleteDomain(domain, session);
        await auditLog(session.username, "delete-domain", domain);
        return jsonOk({ ok: true, redirect: "/domains" });
      case "clone":
        if (!body.newDomain) return jsonError("newDomain is verplicht.");
        await cloneDomain(domain, body.newDomain, session);
        await auditLog(session.username, "clone-domain", domain, body.newDomain);
        return jsonOk({ ok: true, domain: body.newDomain });
      case "migrate":
        if (!body.destHost) return jsonError("destHost is verplicht.");
        await migrateDomain(domain, body.destHost, session);
        await auditLog(session.username, "migrate-domain", domain);
        return jsonOk({ ok: true });
      case "transfer":
        if (!body.newOwner) return jsonError("newOwner is verplicht.");
        await transferDomain(domain, body.newOwner, session);
        await auditLog(session.username, "transfer-domain", domain);
        return jsonOk({ ok: true });
      default:
        return jsonError("Onbekende actie.");
    }
  } catch (err) {
    return handleApiError(err);
  }
}
