import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { nativeFeatureEnabled } from "@/lib/provisioner/native-features";
import { isIndependentMode } from "@/lib/provisioner/native-stub";
import { runProvisioningHelper } from "@/lib/provisioner/native-exec";

type Params = { params: Promise<{ domain: string }> };

function nativeBackups(): boolean {
  return nativeFeatureEnabled("backup") || isIndependentMode();
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (!nativeBackups()) {
      return jsonError("Backup download requires native backup mode.", 501);
    }
    const name = new URL(request.url).searchParams.get("name")?.trim();
    if (!name) return jsonError("name is required.");

    const resolved = await runProvisioningHelper("backup-resolve", domain, name);
    const filePath = String(resolved.path ?? "");
    const fileName = String(resolved.fileName ?? name);
    const sizeBytes = Number(resolved.sizeBytes ?? 0);
    if (!filePath) return jsonError("Could not resolve backup file.", 404);

    await auditLog(session.username, "backup-download", domain, fileName);

    const child = spawn("sudo", ["/bin/cat", filePath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (!child.stdout) return jsonError("Could not open backup file.", 500);
    const stream = child.stdout;

    const web = Readable.toWeb(stream) as ReadableStream<Uint8Array>;
    const headers: Record<string, string> = {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`,
    };
    if (sizeBytes > 0) headers["Content-Length"] = String(sizeBytes);

    return new Response(web, { headers });
  } catch (err) {
    return handleApiError(err);
  }
}
