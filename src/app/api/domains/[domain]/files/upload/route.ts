import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { isPanelFilesMode, uploadDomainFile } from "@/lib/domain-files";
import { requireDomainApi } from "@/lib/domain-api";

type Params = { params: Promise<{ domain: string }> };

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (!isPanelFilesMode()) {
      return jsonError("Upload is alleen in mock-modus beschikbaar.", 501);
    }

    const form = await request.formData();
    const dir = String(form.get("dir") ?? "");
    const files = form.getAll("files");
    if (files.length === 0) return jsonError("Geen bestanden ontvangen.");

    const uploaded: string[] = [];
    for (const item of files) {
      if (!(item instanceof File)) continue;
      if (item.size > MAX_BYTES) {
        return jsonError(`Bestand ${item.name} is groter dan 10 MB.`);
      }
      const bytes = new Uint8Array(await item.arrayBuffer());
      const path = uploadDomainFile(dir, item.name, bytes);
      uploaded.push(path);
      await auditLog(session.username, "upload-file", domain, path);
    }

    if (uploaded.length === 0) return jsonError("Geen geldige bestanden ontvangen.");
    return jsonOk({ uploaded });
  } catch (err) {
    return handleApiError(err);
  }
}
