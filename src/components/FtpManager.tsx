"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { FtpAccount } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function FtpManager({
  domain,
  initialAccounts,
  initialError,
}: {
  domain: string;
  initialAccounts: FtpAccount[];
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [resetUser, setResetUser] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [deleteUser, setDeleteUser] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");

  async function refresh() {
    const res = await fetch(`/api/domains/${enc}/ftp`);
    const data = await res.json();
    if (res.ok) setAccounts(data.accounts ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/ftp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: newUser, pass: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aanmaken mislukt.");
      setSuccess(`FTP-account ${newUser} aangemaakt.`);
      setNewUser("");
      setNewPass("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    if (!resetUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${enc}/ftp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: resetUser, pass: resetPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Mislukt.");
      setResetUser(null);
      setResetPass("");
      setSuccess("Wachtwoord bijgewerkt.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${enc}/ftp`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: deleteUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verwijderen mislukt.");
      setDeleteUser(null);
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
      <DomainPageHeader domain={domain} title="FTP-accounts" />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <h2 className="text-lg font-medium text-white">Account aanmaken</h2>
        <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
          <Input placeholder="gebruiker" value={newUser} onChange={(e) => setNewUser(e.target.value)} required />
          <Input type="password" placeholder="wachtwoord" value={newPass} onChange={(e) => setNewPass(e.target.value)} required />
          <Button type="submit" disabled={loading}>Aanmaken</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Gebruiker</th>
              <th className="px-6 py-3">Home</th>
              <th className="px-6 py-3">Quota</th>
              <th className="px-6 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.user} className="border-b border-panel-border/50">
                <td className="px-6 py-4 text-white">{a.user}</td>
                <td className="px-6 py-4 text-panel-muted">{a.dir ?? "—"}</td>
                <td className="px-6 py-4">{a.quota ?? "—"}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="secondary" onClick={() => setResetUser(a.user)}>Wachtwoord</Button>
                  <Button variant="danger" onClick={() => setDeleteUser(a.user)}>Verwijderen</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">Geen FTP-accounts.</p>
        )}
      </Card>

      {resetUser && (
        <Card>
          <Label>Wachtwoord voor {resetUser}</Label>
          <div className="mt-2 flex gap-2">
            <Input type="password" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
            <Button onClick={savePassword} disabled={!resetPass}>Opslaan</Button>
            <Button variant="ghost" onClick={() => setResetUser(null)}>Annuleren</Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteUser}
        title="FTP-account verwijderen"
        description={`Verwijder FTP-gebruiker ${deleteUser}?`}
        confirmLabel="Verwijderen"
        confirmValue={deleteUser ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteUser(null); setConfirmTyped(""); }}
        loading={loading}
      />
    </div>
  );
}
