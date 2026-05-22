import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { getProvisioner } from "@/lib/provisioner";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const users = await getProvisioner().listMailboxes(domain, session);
    return jsonOk({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const body = (await request.json()) as {
      user?: string;
      pass?: string;
      real?: string;
    };
    if (!body.user || !body.pass) {
      return jsonError("Username and password are required.");
    }
    await getProvisioner().createMailbox(domain, body.user, body.pass, body.real, session);
    await auditLog(session.username, "create-user", domain, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const body = (await request.json()) as { user?: string; pass?: string };
    if (!body.user || !body.pass) {
      return jsonError("User and new password are required.");
    }
    await getProvisioner().updateMailboxPassword(domain, body.user, body.pass, session);
    await auditLog(session.username, "modify-user", domain, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const body = (await request.json()) as { user?: string };
    if (!body.user) {
      return jsonError("Username is required.");
    }
    await getProvisioner().deleteMailbox(domain, body.user, session);
    await auditLog(session.username, "delete-user", domain, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
