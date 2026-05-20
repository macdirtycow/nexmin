import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { listTemplates } from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    return jsonOk({ templates: await listTemplates(session) });
  } catch (err) {
    return handleApiError(err);
  }
}
