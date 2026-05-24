import { auditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-api";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  getLinuxUpdateStatus,
  getUpdateJob,
  probeUpdatesHelperSudo,
  startLinuxUpgrade,
} from "@/lib/updates-helper";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (jobId) {
      if (!(await probeUpdatesHelperSudo())) {
        return jsonError(
          "Updates helper not configured. Run: sudo bash scripts/configure-updates-sudo.sh",
          503,
        );
      }
      const { job, log } = await getUpdateJob(jobId);
      return jsonOk({ job, log });
    }
    if (!(await probeUpdatesHelperSudo())) {
      return jsonOk({
        available: false,
        error:
          "Updates helper not configured. Run: sudo bash /opt/qadbak/scripts/configure-updates-sudo.sh",
      });
    }
    const refresh = searchParams.get("refresh") === "1";
    const { linux, fromCache } = await getLinuxUpdateStatus(refresh);
    return jsonOk({ available: true, linux, fromCache });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!(await probeUpdatesHelperSudo())) {
      return jsonError(
        "Updates helper not configured. Run: sudo bash scripts/configure-updates-sudo.sh",
        503,
      );
    }
    const body = (await request.json()) as { action?: string };
    const action = body.action;
    if (action === "refresh") {
      const { linux, fromCache } = await getLinuxUpdateStatus(true);
      await auditLog(session.username, "updates-linux-refresh");
      return jsonOk({ available: true, linux, fromCache });
    }
    if (action === "upgrade") {
      const job = await startLinuxUpgrade();
      await auditLog(session.username, "updates-linux-upgrade", job.id);
      return jsonOk({ job });
    }
    return jsonError('Invalid action. Use "refresh" or "upgrade".');
  } catch (err) {
    return handleApiError(err);
  }
}
