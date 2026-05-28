import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonOk } from "@/lib/api";
import { buildPrivacyReport } from "@/lib/privacy-report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    if (url.searchParams.get("export") === "audit") {
      const logPath = path.join(process.cwd(), "data", "audit.log");
      try {
        const raw = await readFile(logPath, "utf8");
        const lines = raw.trim().split("\n").filter(Boolean);
        const tail = lines.slice(-5000).join("\n");
        return new Response(tail ? `${tail}\n` : "", {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Content-Disposition":
              'attachment; filename="qadbak-audit-log-tail.ndjson"',
            "Cache-Control": "no-store",
          },
        });
      } catch {
        return new Response("", {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }
    const report = await buildPrivacyReport();
    return jsonOk(report);
  } catch (err) {
    return handleApiError(err);
  }
}
