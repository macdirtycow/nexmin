import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  listGlobalFeatures,
  runConfigSystem,
  setGlobalFeature,
} from "@/lib/virtualmin";

export async function GET() {
  try {
    const session = await requireAdmin();
    const features = await listGlobalFeatures(session);
    return jsonOk({
      features,
      bundles: ["LAMP", "LEMP", "Minimal"],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      feature?: string;
      enabled?: boolean;
      bundle?: string;
    };

    if (body.action === "feature") {
      if (!body.feature || body.enabled === undefined) {
        return jsonError("feature and enabled are required.");
      }
      await setGlobalFeature(body.feature, body.enabled, session);
      await auditLog(
        session.username,
        "set-global-feature",
        undefined,
        body.feature,
      );
      return jsonOk({ features: await listGlobalFeatures(session) });
    }

    if (body.action === "config-system") {
      if (!body.bundle?.trim()) return jsonError("Bundle is required.");
      const result = await runConfigSystem(body.bundle.trim(), session);
      await auditLog(session.username, "config-system", undefined, body.bundle);
      return jsonOk({ ok: true, result });
    }

    return jsonError("Unknown action.");
  } catch (err) {
    return handleApiError(err);
  }
}
