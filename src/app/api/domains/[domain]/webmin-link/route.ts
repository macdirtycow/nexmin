import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { domainUnixUser } from "@/lib/domain-files";
import {
  createWebminLoginLink,
  moduleById,
  webminModulesForDomain,
} from "@/lib/webmin";
import { listDomains } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const url = new URL(request.url);
    const moduleId = url.searchParams.get("module");
    const redirect = url.searchParams.get("redirect");

    let redirectPath = redirect ?? undefined;
    let target: "domain" | "usermin" = "domain";
    let userminUser: string | undefined;

    if (moduleId) {
      const mod = moduleById(webminModulesForDomain(), moduleId);
      if (!mod) return jsonError("Unknown module.");
      redirectPath = mod.path;
      if (mod.usermin) {
        target = "usermin";
        const domains = await listDomains(session);
        const info = domains.find(
          (d) => d.name.toLowerCase() === domain.toLowerCase(),
        );
        userminUser = info?.user ?? domainUnixUser(domain);
      }
    }

    const link = await createWebminLoginLink(session, {
      target,
      domain: target === "domain" ? domain : undefined,
      userminUser,
      redirectPath,
    });
    await auditLog(session.username, "webmin-login", domain, moduleId ?? target);
    return jsonOk({ url: link });
  } catch (err) {
    return handleApiError(err);
  }
}
