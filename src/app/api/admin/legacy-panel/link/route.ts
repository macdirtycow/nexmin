import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { catalogModule } from "@/lib/legacy-panel-catalog";
import {
  createLegacyPanelLoginLink,
  moduleById,
  legacyPanelModulesForAdmin,
} from "@/lib/legacy-panel";
import { legacyPanelUiEnabled } from "@/lib/independent-mode";

export async function GET(request: Request) {
  try {
    if (!legacyPanelUiEnabled()) {
      return jsonError("Legacy panel login links are disabled.", 410);
    }
    const session = await requireAdmin();
    const url = new URL(request.url);
    const moduleId = url.searchParams.get("module");
    const redirect = url.searchParams.get("redirect");

    let redirectPath = redirect ?? undefined;
    if (moduleId) {
      const mod =
        moduleById(legacyPanelModulesForAdmin(), moduleId) ??
        catalogModule(moduleId);
      if (!mod) return jsonError("Unknown server module.");
      redirectPath = mod.path;
    }

    const link = await createLegacyPanelLoginLink(session, {
      target: "root",
      redirectPath,
    });
    await auditLog(session.username, "legacy-panel-login", undefined, moduleId ?? "root");
    return jsonOk({ url: link });
  } catch (err) {
    return handleApiError(err);
  }
}
