import { requireAdmin } from "@/lib/admin-api";
import { jsonError, jsonOk } from "@/lib/api";
import {
  listPanelPm2Processes,
  probePanelPm2Sudo,
  runPanelPm2Action,
} from "@/lib/panel-pm2";
import { premiumApiError } from "@/lib/premium/guard";

const ACTIONS = [
  "restart",
  "stop",
  "start",
  "restart-terminal",
  "restart-all",
] as const;

type Action = (typeof ACTIONS)[number];

export async function GET() {
  try {
    await requireAdmin();
    if (!(await probePanelPm2Sudo())) {
      return jsonOk({
        available: false,
        error:
          "Panel control not configured. Run: sudo bash /opt/qadbak/scripts/configure-panel-pm2-sudo.sh",
      });
    }
    const processes = await listPanelPm2Processes();
    return jsonOk({ available: true, processes });
  } catch (err) {
    return premiumApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!(await probePanelPm2Sudo())) {
      return jsonError(
        "Panel control not configured. Run: sudo bash scripts/configure-panel-pm2-sudo.sh",
        503,
      );
    }
    const body = (await request.json()) as { action?: string };
    const action = body.action;
    if (!action || !ACTIONS.includes(action as Action)) {
      return jsonError(`Invalid action. Use: ${ACTIONS.join(", ")}.`);
    }
    const output = await runPanelPm2Action(action as Action);
    const processes = await listPanelPm2Processes().catch(() => []);
    return jsonOk({ ok: true, action, output, processes });
  } catch (err) {
    return premiumApiError(err);
  }
}
