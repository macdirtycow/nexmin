import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

export async function GET() {
  try {
    const session = await requireAdmin();
    const [bandwidth, services] = await Promise.all([
      getProvisioner().listBandwidth(session),
      getProvisioner().listServerStatuses(session),
    ]);
    return jsonOk({ bandwidth, services });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { service?: string };
    if (!body.service) return jsonError("Service is required.");
    await getProvisioner().restartServer(body.service, session);
    await auditLog(session.username, "restart-server", undefined, body.service);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
