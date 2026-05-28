import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { getProvisioner } from "@/lib/provisioner";
import { runProvisioningHelper } from "@/lib/provisioner/native-exec";

type Params = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const url = new URL(request.url);
    if (url.searchParams.get("modsecLogs") === "1" && session.role === "admin") {
      const logs = await runProvisioningHelper(
        "modsecurity-logs",
        domain,
        url.searchParams.get("lines") ?? "200",
        url.searchParams.get("grep")?.trim() || domain,
      );
      const crs = await runProvisioningHelper("modsecurity-crs-check").catch(() => ({
        installed: false,
      }));
      return jsonOk({ modsecurityLogs: logs, crs });
    }
    if (url.searchParams.get("malware") === "1") {
      if (session.role !== "admin") {
        return jsonError("Only administrators may view malware scan status.", 403);
      }
      const mal = await runProvisioningHelper("malware-status", domain);
      return jsonOk({ malware: mal });
    }
    const [mail, modsec, fail2ban] = await Promise.all([
      getProvisioner().getMailSecurity(domain, session),
      runProvisioningHelper("modsecurity-status", domain).catch(() => ({
        enabled: false,
      })),
      session.role === "admin"
        ? runProvisioningHelper("fail2ban-status").catch(() => ({ raw: "" }))
        : Promise.resolve({ raw: "" }),
    ]);
    return jsonOk({
      mail,
      modsecurity: modsec,
      fail2ban: session.role === "admin" ? String(fail2ban.raw ?? "") : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const body = (await request.json()) as {
      spamEnabled?: boolean;
      dkimEnabled?: boolean;
      modsecurityEnabled?: boolean;
      action?: string;
      schedule?: string;
      malwareEnabled?: boolean;
      quarantine?: boolean;
    };

    if (body.action === "malware-scan") {
      if (session.role !== "admin") {
        return jsonError("Only administrators may run malware scans.", 403);
      }
      const r = await runProvisioningHelper("malware-scan", domain);
      await auditLog(session.username, "malware-scan", domain);
      return jsonOk({ ok: true, ...r });
    }

    if (body.action === "malware-schedule") {
      if (session.role !== "admin") {
        return jsonError("Only administrators may configure malware schedule.", 403);
      }
      await runProvisioningHelper(
        "malware-schedule-set",
        domain,
        JSON.stringify({
          schedule: body.schedule,
          enabled: body.malwareEnabled,
          quarantine: body.quarantine,
        }),
      );
      await auditLog(session.username, "malware-schedule", domain);
      return jsonOk({ ok: true });
    }

    if (body.modsecurityEnabled !== undefined) {
      if (session.role !== "admin") {
        return jsonError("Only administrators may change WAF settings.", 403);
      }
      await runProvisioningHelper(
        "modsecurity-toggle",
        domain,
        body.modsecurityEnabled ? "true" : "false",
      );
      await auditLog(session.username, "modsecurity-toggle", domain);
    }

    if (body.spamEnabled !== undefined) {
      await getProvisioner().setSpamFilter(domain, body.spamEnabled, session);
      await auditLog(session.username, "set-spam", domain);
    }
    if (body.dkimEnabled !== undefined) {
      await getProvisioner().setDkim(domain, body.dkimEnabled, session);
      await auditLog(session.username, "set-dkim", domain);
    }

    if (
      body.spamEnabled === undefined &&
      body.dkimEnabled === undefined &&
      body.modsecurityEnabled === undefined &&
      !body.action
    ) {
      return jsonError("No settings to update.");
    }

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
