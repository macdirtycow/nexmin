import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import {
  createMailbox,
  deleteMailbox,
  listMailboxes,
  updateMailboxPassword,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const users = await listMailboxes(domain, session);
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
      return jsonError("Gebruikersnaam en wachtwoord zijn verplicht.");
    }
    await createMailbox(domain, body.user, body.pass, body.real, session);
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
      return jsonError("Gebruiker en nieuw wachtwoord zijn verplicht.");
    }
    await updateMailboxPassword(domain, body.user, body.pass, session);
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
      return jsonError("Gebruikersnaam is verplicht.");
    }
    await deleteMailbox(domain, body.user, session);
    await auditLog(session.username, "delete-user", domain, body.user);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
