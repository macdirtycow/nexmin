import { auditLog } from "@/lib/audit";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getMailSettings, updateMailSettings } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const settings = await getMailSettings(domain, session);
    return jsonOk({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      catchAll?: string;
      autoresponder?: string;
      autoresponderEnabled?: boolean;
    };
    await updateMailSettings(domain, body, session);
    await auditLog(session.username, "modify-mail", domain);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
