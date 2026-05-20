import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { restoreDomain } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may perform a restore.", 403);
    }
    const body = (await request.json()) as {
      source?: string;
      test?: boolean;
    };
    if (!body.source?.trim()) {
      return jsonError("Source path or S3 URL is required.");
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
