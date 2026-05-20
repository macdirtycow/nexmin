import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { createReseller, deleteReseller, listResellers } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    const resellers = await listResellers(session);
    return jsonOk({ resellers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { name?: string; pass?: string };
    if (!body.name || !body.pass) {
      return jsonError("Naam en wachtwoord zijn verplicht.");
    }
    await createReseller(body.name, body.pass, session);
    await auditLog(session.username, "create-reseller", undefined, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { name?: string };
    if (!body.name) return jsonError("Naam is verplicht.");
    await deleteReseller(body.name, session);
    await auditLog(session.username, "delete-reseller", undefined, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
