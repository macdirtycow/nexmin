import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { createPlan, deletePlan, listPlans } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ plans: await listPlans(session) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { name?: string };
    if (!body.name) return jsonError("Plannaam is verplicht.");
    await createPlan(body.name, session);
    await auditLog(session.username, "create-plan", undefined, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { name?: string };
    if (!body.name) return jsonError("Plannaam is verplicht.");
    await deletePlan(body.name, session);
    await auditLog(session.username, "delete-plan", undefined, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
