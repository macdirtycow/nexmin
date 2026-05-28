import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { runProvisioningHelper } from "@/lib/provisioner/native-exec";

export async function GET() {
  try {
    await requireAdmin();
    const r = await runProvisioningHelper("fail2ban-status");
    return jsonOk(r);
  } catch (err) {
    return handleApiError(err);
  }
}
