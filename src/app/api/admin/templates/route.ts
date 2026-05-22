import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ templates: await getProvisioner().listTemplates(session) });
  } catch (err) {
    return handleApiError(err);
  }
}
