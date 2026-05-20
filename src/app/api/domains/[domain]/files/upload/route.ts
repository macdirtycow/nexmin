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
      return jsonError("Upload is only available in mock mode.", 501);
    }

    const form = await request.formData();
    const dir = String(form.get("dir") ?? "");
    const files = form.getAll("files");
    if (files.length === 0) return jsonError("No files received.");

    const uploaded: string[] = [];
    for (const item of files) {
      if (!(item instanceof File)) continue;
      if (item.size > MAX_BYTES) {
        return jsonError(`File ${item.name} is larger than 10 MB.`);
      }
      const bytes = new Uint8Array(await item.arrayBuffer());
      const path = uploadDomainFile(dir, item.name, bytes);
      uploaded.push(path);
      await auditLog(session.username, "upload-file", domain, path);
    }

    if (uploaded.length === 0) return jsonError("No valid files received.");
    return jsonOk({ uploaded });
  } catch (err) {
    return handleApiError(err);
  }
}
