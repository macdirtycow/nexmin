"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { UrlRedirect } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function RedirectsManager({
  domain,
  initialRedirects,
  initialError,
}: {
  domain: string;
  initialRedirects: UrlRedirect[];
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [redirects, setRedirects] = useState(initialRedirects);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [path, setPath] = useState("/");
  const [dest, setDest] = useState("");
  const [rtype, setRtype] = useState("301");
  const [loading, setLoading] = useState(false);
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");

  async function refresh() {
    const res = await fetch(`/api/domains/${enc}/redirects`);
    const data = await res.json();
    if (res.ok) setRedirects(data.redirects ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/redirects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, dest, type: rtype }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aanmaken mislukt.");
      setSuccess("Redirect aangemaakt.");
      setPath("/");
      setDest("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deletePath) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${enc}/redirects`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: deletePath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verwijderen mislukt.");
      setSuccess("Redirect verwijderd.");
      setDeletePath(null);
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
      <DomainPageHeader domain={domain} title="URL-redirects" />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <h2 className="text-lg font-medium text-white">Redirect toevoegen</h2>
        <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="path">Pad</Label>
            <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="dest">Bestemming URL</Label>
            <Input id="dest" value={dest} onChange={(e) => setDest(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="rtype">Type</Label>
            <select
              id="rtype"
              className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm"
              value={rtype}
              onChange={(e) => setRtype(e.target.value)}
            >
              <option value="301">301 permanent</option>
              <option value="302">302 tijdelijk</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>Toevoegen</Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Pad</th>
              <th className="px-6 py-3">Bestemming</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {redirects.map((r) => (
              <tr key={r.path} className="border-b border-panel-border/50">
                <td className="px-6 py-4 text-white">{r.path}</td>
                <td className="px-6 py-4 text-panel-muted break-all">{r.dest}</td>
                <td className="px-6 py-4">{r.type ?? "301"}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="danger" onClick={() => setDeletePath(r.path)}>
                    Verwijderen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {redirects.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">Geen redirects.</p>
        )}
      </Card>

      <ConfirmDialog
        open={!!deletePath}
        title="Redirect verwijderen"
        description={`Verwijder redirect voor pad ${deletePath}?`}
        confirmLabel="Verwijderen"
        confirmValue={deletePath ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => { setDeletePath(null); setConfirmTyped(""); }}
        loading={loading}
      />
    </div>
  );
}
