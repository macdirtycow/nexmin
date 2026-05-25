import { requireAdmin } from "@/lib/admin-api";
import { jsonError, jsonOk } from "@/lib/api";
import {
  ensurePanelVhost,
  getPanelClientStatus,
  upsertPanelClient,
} from "@/lib/panel-client-admin";
import { premiumApiError } from "@/lib/premium/guard";

type Props = { params: Promise<{ domain: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { domain } = await params;
    const status = await getPanelClientStatus(decodeURIComponent(domain));
    return jsonOk(status);
  } catch (err) {
    return premiumApiError(err);
  }
}

export async function POST(request: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { domain } = await params;
    const domainName = decodeURIComponent(domain).trim().toLowerCase();
    const body = (await request.json()) as {
      action?: string;
      password?: string;
      username?: string;
    };

    if (body.action === "apply-vhost") {
      const output = await ensurePanelVhost(domainName);
      const status = await getPanelClientStatus(domainName);
      return jsonOk({ ok: true, output, ...status });
    }

    if (body.action === "upsert-client") {
      const { username, created, password } = await upsertPanelClient({
        domain: domainName,
        password: body.password,
        username: body.username,
      });
      const status = await getPanelClientStatus(domainName);
      return jsonOk({
        ok: true,
        username,
        created,
        password,
        message: created
          ? "Client account created."
          : "Client password updated.",
        ...status,
      });
    }

    return jsonError('Invalid action. Use "upsert-client" or "apply-vhost".');
  } catch (err) {
    return premiumApiError(err);
  }
}
