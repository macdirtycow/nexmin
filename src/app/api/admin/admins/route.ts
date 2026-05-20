import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { createAdmin, deleteAdmin, listAdmins } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ admins: await listAdmins(session) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { user?: string; pass?: string };
    if (!body.user || !body.pass) {
      return jsonError("User and password are required.");
    }
    await createAdmin(body.user, body.pass, session);
    await auditLog(session.username, "create-admin", undefined, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { user?: string };
    if (!body.user) return jsonError("User is required.");
    await deleteAdmin(body.user, session);
    await auditLog(session.username, "delete-admin", undefined, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
