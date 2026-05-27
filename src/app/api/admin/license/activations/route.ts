import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  listLicenseActivations,
  readStoredLicense,
  removeLicenseActivation,
} from "@/lib/qadbak-license";

export async function GET() {
  try {
    await requireAdmin();
    const stored = await readStoredLicense();
    if (!stored) {
      return jsonOk({
        activations: [],
        maxServers: 1,
        currentInstanceId: "",
      });
    }
    const data = await listLicenseActivations();
    return jsonOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as { instanceId?: string };
    const instanceId = body.instanceId?.trim();
    if (!instanceId) return jsonError("instanceId is required.");
    await removeLicenseActivation(instanceId);
    await auditLog(session.username, "license-activation-remove", instanceId);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
