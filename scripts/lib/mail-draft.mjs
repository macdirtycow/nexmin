import { emit, fail } from "./provisioning-common.mjs";
import { buildRfc822Message } from "./mail-message.mjs";
import { saveMailToFolder } from "./mail-folders.mjs";

export async function mailDraftSaveDirect(domain, localUser, payloadJson) {
  let payload;
  try {
    payload =
      typeof payloadJson === "string" ? JSON.parse(payloadJson) : payloadJson;
  } catch {
    fail("Invalid draft payload JSON");
  }

  const local = String(localUser || "").trim().toLowerCase();
  if (!local) fail("Mailbox user required");

  const from = `${local}@${domain}`;
  const message = buildRfc822Message(
    from,
    String(payload.to || "").trim(),
    String(payload.subject || ""),
    String(payload.body ?? ""),
    {
      cc: String(payload.cc || "").trim(),
      draft: true,
    },
  );

  const saved = await saveMailToFolder(domain, local, "Drafts", message);
  if (!saved.ok) fail(saved.error || "Could not save draft to Drafts folder.");

  emit({
    ok: true,
    folder: "Drafts",
    mailbox: saved.mailbox,
    source: saved.source,
  });
}
