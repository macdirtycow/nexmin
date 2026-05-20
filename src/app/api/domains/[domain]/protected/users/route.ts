import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  createProtectedUser,
  deleteProtectedUser,
  listProtectedUsers,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const path = new URL(request.url).searchParams.get("path");
    if (!path) return jsonError("Query parameter path is verplicht.");
    const users = await listProtectedUsers(domain, path, session);
    return jsonOk({ users, path });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      path?: string;
      user?: string;
      pass?: string;
    };
    if (!body.path || !body.user || !body.pass) {
      return jsonError("Pad, gebruiker en wachtwoord zijn verplicht.");
    }
    await createProtectedUser(domain, body.path, body.user, body.pass, session);
    await auditLog(session.username, "create-protected-user", domain, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { path?: string; user?: string };
    if (!body.path || !body.user) {
      return jsonError("Pad en gebruiker zijn verplicht.");
    }
    await deleteProtectedUser(domain, body.path, body.user, session);
    await auditLog(session.username, "delete-protected-user", domain, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
