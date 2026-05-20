import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { checkServerConfig } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    const message = await checkServerConfig(session);
    await auditLog(session.username, "check-config");
    return jsonOk({ message });
  } catch (err) {
    return handleApiError(err);
  }
}
