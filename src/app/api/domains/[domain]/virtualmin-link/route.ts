import { auditLog } from "@/lib/audit";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { virtualminEmbedPath } from "@/lib/virtualmin-embed";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const urlParams = new URL(request.url).searchParams;
    const dest = urlParams.get("dest");
    const path = urlParams.get("path");
    const unixUser =
      dest === "terminal" ? await getProvisioner().resolveDomainUnixUser(domain, session) : undefined;
    const redirectUrl =
      path != null
        ? path.startsWith("/")
          ? path
          : `/${path}`
        : virtualminEmbedPath(dest, unixUser);
    const url = await getProvisioner().createVirtualMinLoginLink(domain, session, { redirectUrl });
    await auditLog(session.username, "create-login-link", domain);
    return jsonOk({ url });
  } catch (err) {
    return handleApiError(err);
  }
}
