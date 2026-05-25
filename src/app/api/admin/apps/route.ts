import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { listTemplates } from "@/lib/apps";

/** GET /api/admin/apps — list available intent-based app templates. */
export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ templates: listTemplates() });
  } catch (err) {
    return handleApiError(err);
  }
}
