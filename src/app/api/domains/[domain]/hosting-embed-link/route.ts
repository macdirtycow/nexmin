import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { legacyPanelUiEnabled } from "@/lib/independent-mode";
import { requireDomainApi } from "@/lib/domain-api";
import {
  legacyPanelEmbedPath,
  normalizeLegacyPanelRedirect,
} from "@/lib/legacy-panel-embed";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    if (!legacyPanelUiEnabled()) {
      return jsonError("Legacy panel login links are disabled.", 410);
    }
    const { session, domain } = await requireDomainApi((await params).domain);
    const urlParams = new URL(request.url).searchParams;
    const dest = urlParams.get("dest");
    const path = urlParams.get("path");
    const unixUser =
      dest === "terminal" ? await getProvisioner().resolveDomainUnixUser(domain, session) : undefined;
    let redirectUrl: string | undefined;
    if (path != null) {
      const raw = path.startsWith("/") ? path : `/${path}`;
      redirectUrl = normalizeLegacyPanelRedirect(raw);
    } else {
      redirectUrl = legacyPanelEmbedPath(dest, unixUser);
    }
    const url = await getProvisioner().createDomainLegacyLoginLink(domain, session, { redirectUrl });
    await auditLog(session.username, "create-login-link", domain);
    return jsonOk({ url });
  } catch (err) {
    return handleApiError(err);
  }
}
