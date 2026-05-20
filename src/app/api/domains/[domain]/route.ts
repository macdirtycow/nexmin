import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { isDomainDisabled } from "@/lib/domain-utils";
import { listDomains } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const domains = await listDomains(session);
    const found = domains.find(
      (d) => d.name.toLowerCase() === domain.toLowerCase(),
    );
    if (!found) {
      return jsonError("Domain not found.", 404);
    }
    return jsonOk({
      domain: found,
      disabled: isDomainDisabled(found),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
