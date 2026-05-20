import { handleApiError, jsonError } from "@/lib/api";
import { getDomainFileDownload, isPanelFilesMode } from "@/lib/domain-files";
import { requireDomainApi } from "@/lib/domain-api";
import { VirtualMinError } from "@/lib/virtualmin";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireDomainApi((await params).domain);
    if (!isPanelFilesMode()) {
      return jsonError("Download is alleen in mock-modus beschikbaar.", 501);
    }
    const path = new URL(request.url).searchParams.get("path");
    if (!path) return jsonError("Pad is verplicht.");

    const { body, mime, filename } = getDomainFileDownload(path);
    return new Response(Buffer.from(body), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Content-Length": String(body.length),
      },
    });
  } catch (err) {
    if (err instanceof VirtualMinError) {
      return jsonError(err.message, 400);
    }
    return handleApiError(err);
  }
}
