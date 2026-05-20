import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireSession } from "@/lib/session";
import {
  createDatabase,
  listDatabases,
  updateDatabasePassword,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { domain: encoded } = await params;
    const domain = decodeURIComponent(encoded);
    const databases = await listDatabases(domain, session);
    return jsonOk({ databases });
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
      name?: string;
      pass?: string;
      type?: string;
    };
    if (!body.name || !body.pass) {
      return jsonError("Database name and password are required.");
    }
    await createDatabase(
      domain,
      body.name,
      body.pass,
      body.type ?? "mysql",
      session,
    );
    await auditLog(session.username, "create-database", domain, body.name);
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
    const body = (await request.json()) as { name?: string; pass?: string };
    if (!body.name || !body.pass) {
      return jsonError("Database name and password are required.");
    }
    await updateDatabasePassword(domain, body.name, body.pass, session);
    await auditLog(session.username, "modify-database-pass", domain, body.name);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
