"use client";

import { Alert, Badge, Button, Card, Input, Label } from "@/components/ui";
import type { ImapMailbox } from "@/lib/provisioner";
import { useCallback, useEffect, useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

type MailUser = { user: string; email?: string; label?: string };

export function ImapMailboxesManager({
  domain,
  initialMailboxes,
  initialError,
  isAdmin,
}: {
  domain: string;
  initialMailboxes: ImapMailbox[];
  initialError: string;
  isAdmin: boolean;
}) {
  const enc = encodeURIComponent(domain);
  const [mailboxes, setMailboxes] = useState(initialMailboxes);
  const [error, setError] = useState(initialError);
  const [users, setUsers] = useState<MailUser[]>([]);
  const [user, setUser] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState("INBOX");
  const [copyTo, setCopyTo] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = user ? `?user=${encodeURIComponent(user)}` : "";
      const res = await fetch(`/api/domains/${enc}/mailboxes${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed.");
      setMailboxes(data.mailboxes ?? []);
      if (Array.isArray(data.users) && data.users.length) {
        setUsers(data.users);
        if (!user && data.users[0]?.user) setUser(data.users[0].user);
      }
      setSource(data.source ?? null);
      setAuthUser(data.authUser ?? null);
      if (data.hint && !user) setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }, [enc, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy() {
    if (!copyFrom || !copyTo || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/domains/${enc}/mailboxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: copyFrom, to: copyTo, user }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Copy failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  const sourceLabel =
    source === "doveadm"
      ? "Dovecot (doveadm)"
      : source === "maildir"
        ? "Maildir scan"
        : source ?? null;

  return (
    <div className="space-y-6">
      <DomainPageHeader domain={domain} title="IMAP mailboxes" />
      <p className="text-sm text-panel-muted">
        Folders via open-source{" "}
        <a
          href="https://doc.dovecot.org/"
          className="text-accent hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Dovecot
        </a>{" "}
        (<code className="text-white">doveadm</code>) — no VirtualMin.
      </p>
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Mailbox user</Label>
            {users.length > 0 ? (
              <select
                className="mt-1 block w-48 rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-white"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.user} value={u.user}>
                    {u.label ?? u.email ?? u.user}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="mt-1 w-48"
                placeholder="info"
              />
            )}
          </div>
          <Button onClick={load} disabled={loading || !user}>
            {loading ? "Loading…" : "Load folders"}
          </Button>
          {sourceLabel && (
            <Badge>{sourceLabel}</Badge>
          )}
          {authUser && (
            <span className="text-xs text-panel-muted">
              Dovecot user: <code className="text-white">{authUser}</code>
            </span>
          )}
        </div>
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-panel-muted">
            <tr>
              <th className="py-2">Folder</th>
              <th className="py-2">Messages</th>
              <th className="py-2">Size</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((m, i) => (
              <tr key={`${m.folder}-${i}`} className="border-t border-panel-border/50">
                <td className="py-3 text-white">{m.folder}</td>
                <td className="py-3">{m.messages ?? "—"}</td>
                <td className="py-3 text-panel-muted">{m.size ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {user && mailboxes.length === 0 && !loading && (
          <p className="py-6 text-center text-panel-muted">
            No folders found. Check Dovecot is running and mail exists for this user.
          </p>
        )}
      </Card>
      {isAdmin && (
        <Card>
          <h2 className="text-lg font-medium text-white">Copy mailbox</h2>
          <p className="mt-1 text-sm text-panel-muted">
            Copy all messages between IMAP folders (e.g. INBOX → Archive) via doveadm.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Input
              placeholder="From folder (INBOX)"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
            />
            <Input
              placeholder="To folder"
              value={copyTo}
              onChange={(e) => setCopyTo(e.target.value)}
            />
            <Button onClick={copy} disabled={loading || !user || !copyFrom || !copyTo}>
              Copy
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
