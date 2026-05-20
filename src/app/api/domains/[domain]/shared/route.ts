import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import {
  createSharedAddress,
  deleteSharedAddress,
  listSharedAddresses,
} from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const addresses = await listSharedAddresses(domain, session);
    return jsonOk({ addresses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may create shared addresses.", 403);
    }
    const body = (await request.json()) as { address?: string; users?: string };
    if (!body.address || !body.users) {
      return jsonError("Address and users are required.");
    }
    await createSharedAddress(domain, body.address, body.users, session);
    await auditLog(session.username, "create-shared-address", domain, body.address);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Administrators only.", 403);
    }
    const body = (await request.json()) as { address?: string };
    if (!body.address) return jsonError("Address is required.");
    await deleteSharedAddress(domain, body.address, session);
    await auditLog(session.username, "delete-shared-address", domain, body.address);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
