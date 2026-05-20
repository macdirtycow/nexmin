"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
} from "@/components/ui";
import type { Reseller } from "@/lib/virtualmin";
import { useState } from "react";

export function AdminResellersView({
  initialResellers,
  initialError,
}: {
  initialResellers: Reseller[];
  initialError: string;
}) {
  const [resellers, setResellers] = useState(initialResellers);
  const [error, setError] = useState(initialError);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/resellers");
    const data = await res.json();
    if (res.ok) setResellers(data.resellers ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/resellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mislukt.");
      setName("");
      setPass("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/resellers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deleteName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mislukt.");
      setDeleteName(null);
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
      {error && <Alert>{error}</Alert>}
      <Card>
        <h2 className="text-lg font-medium text-white">Reseller aanmaken</h2>
        <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
          <Input placeholder="naam" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input type="password" placeholder="wachtwoord" value={pass} onChange={(e) => setPass(e.target.value)} required />
          <Button type="submit" disabled={loading}>Aanmaken</Button>
        </form>
      </Card>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Naam</th>
              <th className="px-6 py-3">Domeinen</th>
              <th className="px-6 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {resellers.map((r) => (
              <tr key={r.name} className="border-b border-panel-border/50">
                <td className="px-6 py-4 text-white">{r.name}</td>
                <td className="px-6 py-4">{r.domains ?? "—"}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="danger" onClick={() => setDeleteName(r.name)}>
                    Verwijderen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ConfirmDialog
        open={!!deleteName}
        title="Reseller verwijderen"
        description={`Verwijder reseller ${deleteName}?`}
        confirmLabel="Verwijderen"
        confirmValue={deleteName ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteName(null); setConfirmTyped(""); }}
        loading={loading}
      />
    </div>
  );
}
