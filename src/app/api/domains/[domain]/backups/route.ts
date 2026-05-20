import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  listScheduledBackups,
  modifyScheduledBackup,
  startBackup,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const scheduled = await listScheduledBackups(domain, session);
    return jsonOk({ scheduled, canBackup: session.role === "admin" });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may start a backup.", 403);
    }
    const result = await startBackup(domain, session);
    await auditLog(session.username, "backup-domain", domain);
    return jsonOk({ ok: true, result });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may change schedules.", 403);
    }
    const body = (await request.json()) as {
      id?: string;
      enabled?: boolean;
    };
    if (!body.id || body.enabled === undefined) {
      return jsonError("id and enabled are required.");
    }
    await modifyScheduledBackup(domain, body.id, { enabled: body.enabled }, session);
    await auditLog(session.username, "modify-scheduled-backup", domain, body.id);
    const scheduled = await listScheduledBackups(domain, session);
    return jsonOk({ scheduled });
  } catch (err) {
    return handleApiError(err);
  }
}
