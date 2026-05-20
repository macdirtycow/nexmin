import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  createProtectedDirectory,
  deleteProtectedDirectory,
  listProtectedDirectories,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const directories = await listProtectedDirectories(domain, session);
    return jsonOk({ directories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { path?: string };
    if (!body.path) return jsonError("Path is required.");
    await createProtectedDirectory(domain, body.path, session);
    await auditLog(session.username, "create-protected-directory", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as { path?: string };
    if (!body.path) return jsonError("Path is required.");
    await deleteProtectedDirectory(domain, body.path, session);
    await auditLog(session.username, "delete-protected-directory", domain, body.path);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
