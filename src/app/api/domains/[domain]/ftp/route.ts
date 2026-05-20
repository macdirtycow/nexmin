import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  createFtpAccount,
  deleteFtpAccount,
  listFtpAccountsSafe,
  updateFtpPassword,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const accounts = await listFtpAccountsSafe(domain, session);
    return jsonOk({ accounts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { user?: string; pass?: string };
    if (!body.user || !body.pass) {
      return jsonError("Gebruiker en wachtwoord zijn verplicht.");
    }
    await createFtpAccount(domain, body.user, body.pass, session);
    await auditLog(session.username, "create-user", domain, `ftp:${body.user}`);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { user?: string; pass?: string };
    if (!body.user || !body.pass) {
      return jsonError("Gebruiker en wachtwoord zijn verplicht.");
    }
    await updateFtpPassword(domain, body.user, body.pass, session);
    await auditLog(session.username, "modify-user", domain, `ftp:${body.user}`);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { user?: string };
    if (!body.user) return jsonError("Gebruiker is verplicht.");
    await deleteFtpAccount(domain, body.user, session);
    await auditLog(session.username, "delete-user", domain, `ftp:${body.user}`);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
