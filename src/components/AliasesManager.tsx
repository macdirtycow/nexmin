"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { MailAlias } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function AliasesManager({
  domain,
  initialAliases,
  initialError,
}: {
  domain: string;
  initialAliases: MailAlias[];
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [aliases, setAliases] = useState(initialAliases);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteFrom, setDeleteFrom] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");

  async function refresh() {
    const res = await fetch(`/api/domains/${enc}/aliases`);
    const data = await res.json();
    if (res.ok) setAliases(data.aliases ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aanmaken mislukt.");
      setSuccess(`Alias ${from}@${domain} aangemaakt.`);
      setFrom("");
      setTo("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteFrom) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${enc}/aliases`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: deleteFrom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verwijderen mislukt.");
      setSuccess("Alias verwijderd.");
      setDeleteFrom(null);
      setConfirmTyped("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <DomainPageHeader domain={domain} title="E-mailaliassen" />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <h2 className="text-lg font-medium text-white">Alias toevoegen</h2>
        <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="from">Lokaal deel (van)</Label>
            <Input id="from" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="to">Doorsturen naar</Label>
            <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>{loading ? "Bezig…" : "Toevoegen"}</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Van</th>
              <th className="px-6 py-3">Naar</th>
              <th className="px-6 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {aliases.map((a) => (
              <tr key={a.from} className="border-b border-panel-border/50">
                <td className="px-6 py-4 text-white">{a.from}@{domain}</td>
                <td className="px-6 py-4 text-panel-muted">{a.to}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="danger" onClick={() => setDeleteFrom(a.from)}>
                    Verwijderen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {aliases.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">Geen aliassen.</p>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteFrom}
        title="Alias verwijderen"
        description={`Verwijder alias ${deleteFrom}@${domain}?`}
        confirmLabel="Verwijderen"
        confirmValue={deleteFrom ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteFrom(null); setConfirmTyped(""); }}
        loading={loading}
      />
    </div>
  );
}
