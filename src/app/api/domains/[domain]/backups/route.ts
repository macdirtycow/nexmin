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
      return jsonError("Alleen beheerders mogen een back-up starten.", 403);
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
      return jsonError("Alleen beheerders mogen schema's wijzigen.", 403);
    }
    const body = (await request.json()) as {
      id?: string;
      enabled?: boolean;
    };
    if (!body.id || body.enabled === undefined) {
      return jsonError("id en enabled zijn verplicht.");
    }
    await modifyScheduledBackup(domain, body.id, { enabled: body.enabled }, session);
    await auditLog(session.username, "modify-scheduled-backup", domain, body.id);
    const scheduled = await listScheduledBackups(domain, session);
    return jsonOk({ scheduled });
  } catch (err) {
    return handleApiError(err);
  }
}
