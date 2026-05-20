"use client";

import { Alert, Button, Card, Input, Label } from "@/components/ui";
import type { ImapMailbox } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

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
  const [user, setUser] = useState("info");
  const [copyFrom, setCopyFrom] = useState("");
  const [copyTo, setCopyTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/domains/${enc}/mailboxes?user=${encodeURIComponent(user)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed.");
      setMailboxes(data.mailboxes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!copyFrom || !copyTo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${enc}/mailboxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: copyFrom, to: copyTo }),
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

  return (
    <div className="space-y-6">
      <DomainPageHeader domain={domain} title="IMAP mailboxes" />
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="flex flex-wrap gap-2">
          <div>
            <Label>Mailbox user</Label>
            <Input value={user} onChange={(e) => setUser(e.target.value)} className="mt-1 w-40" />
          </div>
          <Button className="self-end" onClick={load} disabled={loading}>
            Load
          </Button>
        </div>
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-panel-muted">
            <tr>
              <th className="py-2">Directory</th>
              <th className="py-2">Messages</th>
              <th className="py-2">Size</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((m, i) => (
              <tr key={i} className="border-t border-panel-border/50">
                <td className="py-3 text-white">{m.folder}</td>
                <td className="py-3">{m.messages ?? "—"}</td>
                <td className="py-3 text-panel-muted">{m.size ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {isAdmin && (
        <Card>
          <h2 className="text-lg font-medium text-white">Copy mailbox</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Input placeholder="from path" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} />
            <Input placeholder="to path" value={copyTo} onChange={(e) => setCopyTo(e.target.value)} />
            <Button onClick={copy} disabled={loading}>
              Copy
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
