import { randomBytes } from "node:crypto";

/** Build RFC 822 message for send, Sent copy, or Drafts. */
export function buildRfc822Message(from, to, subject, body, opts = {}) {
  const subj = String(subject || "").replace(/\r?\n/g, " ").trim() || "(no subject)";
  const text = String(body ?? "");
  const toLine = String(to || "").trim() || from;
  const messageId =
    String(opts.messageId || "").trim() ||
    `<${randomBytes(12).toString("hex")}@${String(from).split("@")[1] || "qadbak"}>`;
  const date = opts.date || new Date().toUTCString();

  const lines = [
    `From: ${from}`,
    `To: ${toLine}`,
  ];
  const cc = String(opts.cc || "").trim();
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Subject: ${subj}`, `Date: ${date}`, `Message-ID: ${messageId}`);
  const inReplyTo = String(opts.inReplyTo || "").trim();
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  const references = String(opts.references || "").trim();
  if (references) lines.push(`References: ${references}`);
  if (opts.draft) lines.push("X-Qadbak-Draft: yes");
  lines.push(
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
  );
  return lines.join("\r\n");
}
