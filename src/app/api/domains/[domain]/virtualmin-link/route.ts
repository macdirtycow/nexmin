import { auditLog } from "@/lib/audit";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { createVirtualMinLoginLink } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const dest = new URL(request.url).searchParams.get("dest");
    const redirectUrl =
      dest === "fileman" ? "/filemin/index.cgi" : undefined;
    const url = await createVirtualMinLoginLink(domain, session, { redirectUrl });
    await auditLog(session.username, "create-login-link", domain);
    return jsonOk({ url });
  } catch (err) {
    return handleApiError(err);
  }
}
