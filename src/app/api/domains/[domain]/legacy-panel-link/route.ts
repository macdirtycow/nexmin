import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { domainUnixUser } from "@/lib/domain-files";
import {
  createLegacyPanelLoginLink,
  moduleById,
  legacyPanelModulesForDomain,
} from "@/lib/legacy-panel";
import { legacyPanelUiEnabled } from "@/lib/independent-mode";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    if (!legacyPanelUiEnabled()) {
      return jsonError("Legacy panel login links are disabled.", 410);
    }
    const { session, domain } = await requireDomainApi((await params).domain);
    const url = new URL(request.url);
    const moduleId = url.searchParams.get("module");
    const redirect = url.searchParams.get("redirect");

    let redirectPath = redirect ?? undefined;
    let target: "domain" | "account-panel" = "domain";
    let accountPanelUser: string | undefined;

    if (moduleId) {
      const mod = moduleById(legacyPanelModulesForDomain(), moduleId);
      if (!mod) return jsonError("Unknown module.");
      redirectPath = mod.path;
      if (mod.accountPanel) {
        target = "account-panel";
        const domains = await getProvisioner().listDomains(session);
        const info = domains.find(
          (d) => d.name.toLowerCase() === domain.toLowerCase(),
        );
        accountPanelUser = info?.user ?? domainUnixUser(domain);
      }
    }

    const link = await createLegacyPanelLoginLink(session, {
      target,
      domain: target === "domain" ? domain : undefined,
      accountPanelUser,
      redirectPath,
    });
    await auditLog(session.username, "legacy-panel-login", domain, moduleId ?? target);
    return jsonOk({ url: link });
  } catch (err) {
    return handleApiError(err);
  }
}
