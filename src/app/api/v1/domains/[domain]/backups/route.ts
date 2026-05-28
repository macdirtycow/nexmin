import { auditLog } from "@/lib/audit";
import { apiV1Actor, assertApiV1DomainAccess } from "@/lib/api-v1-domain";
import { apiV1Error, requireApiV1 } from "@/lib/api-v1-auth";
import { jsonOk } from "@/lib/api";
import { getProvisioner } from "@/lib/provisioner";
import { runProvisioningHelper } from "@/lib/provisioner/native-exec";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const key = await requireApiV1("backups:read");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const scheduled = await getProvisioner().listScheduledBackups(domain, apiV1Actor());
    const remote = await runProvisioningHelper("backup-list-remote", domain).catch(() => ({
      remote: [],
    }));
    return jsonOk({
      domain,
      backups: scheduled.filter((s) => s.id !== "schedule"),
      remote: remote.remote ?? [],
    });
  } catch (err) {
    return apiV1Error(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const key = await requireApiV1("backups:write");
    const domain = (await params).domain;
    await assertApiV1DomainAccess(key, domain);
    const body = (await request.json()) as {
      action?: string;
      remoteKey?: string;
      testRestore?: boolean;
    };
    if (body.action === "pull-remote" && body.remoteKey) {
      const r = await runProvisioningHelper("backup-pull-remote", domain, body.remoteKey);
      await auditLog(`api:${key.id}`, "api-v1-backup-pull", domain, body.remoteKey);
      return jsonOk({ ok: true, ...r });
    }
    if (body.action === "pull-remote-restore" && body.remoteKey) {
      const r = await runProvisioningHelper(
        "backup-pull-remote-restore",
        domain,
        body.remoteKey,
        body.testRestore ? "true" : "false",
      );
      await auditLog(`api:${key.id}`, "api-v1-backup-pull-restore", domain, body.remoteKey);
      return jsonOk({ ok: true, ...r });
    }
    const r = await getProvisioner().startBackup(domain, apiV1Actor());
    await auditLog(`api:${key.id}`, "api-v1-backup-create", domain);
    return jsonOk({ ok: true, result: r });
  } catch (err) {
    return apiV1Error(err);
  }
}
