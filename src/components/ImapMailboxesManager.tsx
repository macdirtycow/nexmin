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
      if (!res.ok) throw new Error(data.error ?? "Laden mislukt.");
      setMailboxes(data.mailboxes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
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
      if (!res.ok) throw new Error(data.error ?? "Kopiëren mislukt.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <DomainPageHeader domain={domain} title="IMAP-mailboxen" />
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="flex flex-wrap gap-2">
          <div>
            <Label>Mailbox gebruiker</Label>
            <Input value={user} onChange={(e) => setUser(e.target.value)} className="mt-1 w-40" />
          </div>
          <Button className="self-end" onClick={load} disabled={loading}>
            Laden
          </Button>
        </div>
        <table className="mt-6 w-full text-left text-sm">
          <thead className="text-panel-muted">
            <tr>
              <th className="py-2">Map</th>
              <th className="py-2">Berichten</th>
              <th className="py-2">Grootte</th>
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
          <h2 className="text-lg font-medium text-white">Mailbox kopiëren</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Input placeholder="van pad" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} />
            <Input placeholder="naar pad" value={copyTo} onChange={(e) => setCopyTo(e.target.value)} />
            <Button onClick={copy} disabled={loading}>
              Kopiëren
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
