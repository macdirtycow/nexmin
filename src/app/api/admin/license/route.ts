import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ license: await getProvisioner().getLicenseInfo(session) });
  } catch (err) {
    return handleApiError(err);
  }
}
