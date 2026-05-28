import { auditLog } from "@/lib/audit";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireDomainApi } from "@/lib/domain-api";
import { beginJournal } from "@/lib/journal";
import {
  consumeLastJournalSteps,
  runProvisioningHelper,
  runWithJournalStore,
} from "@/lib/provisioner/native-exec";

type Params = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    const [avail, inst] = await Promise.all([
      runProvisioningHelper("script-available", domain),
      runProvisioningHelper("script-list", domain),
    ]);
    return jsonOk({
      available: avail.available ?? [],
      installed: inst.installed ?? [],
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may install apps.", 403);
    }
    const body = (await request.json()) as {
      script?: string;
      path?: string;
      forceOverwrite?: boolean;
    };
    const scriptName = body.script?.trim();
    if (!scriptName) return jsonError("Script name is required.");

    const result = await runWithJournalStore(async () => {
      const journal = beginJournal({
        action: "script.install",
        summary: `Install ${scriptName} on ${domain}`,
        session,
        target: { domain },
        metadata: { script: body.script, path: body.path },
      });
      consumeLastJournalSteps();
      journal.infoStep(`Starting install of ${scriptName} under ${body.path ?? "public_html"}`);
      const r = await runProvisioningHelper(
        "script-install",
        domain,
        scriptName,
        body.path ?? "public_html",
        body.forceOverwrite ? "true" : "false",
      );
      journal.captureFromHelper(consumeLastJournalSteps());
      const finished = await journal.finish(true);
      return {
        journalId: finished.id,
        postInstall: r.postInstall as string[] | undefined,
        adminUrl: r.adminUrl as string | undefined,
        rollbackId: r.rollbackId as string | null | undefined,
      };
    });

    await auditLog(session.username, "install-script", domain, scriptName);
    return jsonOk({
      ok: true,
      postInstall: result.postInstall,
      adminUrl: result.adminUrl,
      rollbackId: result.rollbackId,
      journalId: result.journalId,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may rollback installs.", 403);
    }
    const body = (await request.json()) as { script?: string; rollbackId?: string };
    if (!body.script) return jsonError("script is required");
    const r = await runProvisioningHelper(
      "script-rollback",
      domain,
      body.script,
      body.rollbackId ?? "",
    );
    await auditLog(session.username, "script-rollback", domain, body.script);
    return jsonOk({ ok: true, ...r });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { session, domain } = await requireDomainApi((await params).domain);
    if (session.role !== "admin") {
      return jsonError("Only administrators may delete scripts.", 403);
    }
    const body = (await request.json()) as { script?: string };
    if (!body.script) return jsonError("Script name is required.");
    await runProvisioningHelper("script-delete", domain, body.script);
    await auditLog(session.username, "delete-script", domain, body.script);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
