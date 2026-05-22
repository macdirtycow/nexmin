import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { getHostMetrics } from "@/lib/host-metrics";

export async function GET() {
  try {
    await requireAdmin();
    const metrics = await getHostMetrics();
    return jsonOk({ metrics });
  } catch (err) {
    return handleApiError(err);
  }
}
