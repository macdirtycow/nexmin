import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { restoreDomain } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Alleen beheerders mogen een restore uitvoeren.", 403);
    }
    const body = (await request.json()) as {
      source?: string;
      test?: boolean;
    };
    if (!body.source?.trim()) {
      return jsonError("Bronpad of S3-URL is verplicht.");
    }
    const result = await restoreDomain(
      domain,
      body.source.trim(),
      { test: body.test === true },
      session,
    );
    await auditLog(session.username, "restore-domain", domain);
    return jsonOk({ ok: true, result });
  } catch (err) {
    return handleApiError(err);
  }
}
