import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ plans: await getProvisioner().listPlans(session) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { name?: string };
    if (!body.name) return jsonError("Plan name is required.");
    await getProvisioner().createPlan(body.name, session);
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
    if (!body.name) return jsonError("Plan name is required.");
    await getProvisioner().deletePlan(body.name, session);
    await auditLog(session.username, "delete-plan", undefined, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
