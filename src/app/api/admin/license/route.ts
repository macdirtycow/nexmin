import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { getLicenseInfo } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ license: await getLicenseInfo(session) });
  } catch (err) {
    return handleApiError(err);
  }
}
