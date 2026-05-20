import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { listDomainFeatures, setDomainFeature } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders.", 403);
    }
    const features = await listDomainFeatures(domain, session);
    return jsonOk({ features });
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
      feature?: string;
      enabled?: boolean;
    };
    if (!body.feature || body.enabled === undefined) {
      return jsonError("Feature en enabled zijn verplicht.");
    }
    await setDomainFeature(domain, body.feature, body.enabled, session);
    await auditLog(
      session.username,
      body.enabled ? "enable-feature" : "disable-feature",
      domain,
      body.feature,
    );
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
