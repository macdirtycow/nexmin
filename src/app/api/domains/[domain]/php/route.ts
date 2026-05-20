import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  deletePhpDirectory,
  listPhpDirectories,
  listPhpIni,
  listPhpVersions,
  modifyPhpIni,
  setPhpDirectory,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const url = new URL(request.url);
    const version = url.searchParams.get("version") ?? undefined;
    const [versions, directories, ini] = await Promise.all([
      listPhpVersions(domain, session),
      listPhpDirectories(domain, session),
      listPhpIni(domain, version, session),
    ]);
    return jsonOk({ versions, directories, ini });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      action?: string;
      dir?: string;
      version?: string;
      name?: string;
      value?: string;
    };
    if (body.action === "ini") {
      if (!body.name || body.value === undefined) {
        return jsonError("Name and value are required for php.ini.");
      }
      await modifyPhpIni(domain, body.name, body.value, body.version, session);
      await auditLog(session.username, "modify-php-ini", domain, body.name);
      return jsonOk({ ok: true });
    }
    if (!body.dir || !body.version) {
      return jsonError("Directory and PHP version are required.");
    }
    await setPhpDirectory(domain, body.dir, body.version, session);
    await auditLog(session.username, "set-php-directory", domain, body.dir);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may delete PHP mappings.", 403);
    }
    const body = (await request.json()) as { dir?: string };
    if (!body.dir) return jsonError("Directory (dir) is required.");
    await deletePhpDirectory(domain, body.dir, session);
    await auditLog(session.username, "delete-php-directory", domain, body.dir);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
