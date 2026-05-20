"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { VirtualMinMailbox } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmailManager({
  domain,
  initialUsers,
  initialError,
}: {
  domain: string;
  initialUsers: VirtualMinMailbox[];
  initialError: string;
}) {
  const router = useRouter();
  const enc = encodeURIComponent(domain);
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newReal, setNewReal] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");
  const [resetUser, setResetUser] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState("");

  async function refresh() {
    const res = await fetch(`/api/domains/${enc}/users`);
    const data = await res.json();
    if (res.ok) setUsers(data.users);
  }

  async function createMailbox(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: newUser,
          pass: newPass,
          real: newReal || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aanmaken mislukt.");
      setSuccess(`Mailbox ${newUser}@${domain} aangemaakt.`);
      setShowCreate(false);
      setNewUser("");
      setNewPass("");
      setNewReal("");
      await refresh();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!resetUser || !resetPass) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/users`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: resetUser, pass: resetPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wijzigen mislukt.");
      setSuccess(`Wachtwoord voor ${resetUser} bijgewerkt.`);
      setResetUser(null);
      setResetPass("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: deleteTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verwijderen mislukt.");
      setSuccess(`Mailbox ${deleteTarget} verwijderd.`);
      setDeleteTarget(null);
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
      <div>
        <p className="text-sm text-panel-muted">
          <Link
            href={`/domains/${enc}`}
            className="hover:text-white"
          >
            ← {domain}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">E-mail</h1>
        <p className="mt-1 text-sm text-panel-muted">
          Mailboxen voor {domain}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Annuleren" : "Nieuwe mailbox"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <h2 className="text-lg font-medium text-white">Mailbox aanmaken</h2>
          <form onSubmit={createMailbox} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="user">Gebruikersnaam (lokaal deel)</Label>
              <Input
                id="user"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                placeholder="info"
                required
              />
            </div>
            <div>
              <Label htmlFor="pass">Wachtwoord</Label>
              <Input
                id="pass"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="real">Weergavenaam (optioneel)</Label>
              <Input
                id="real"
                value={newReal}
                onChange={(e) => setNewReal(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Bezig…" : "Aanmaken"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Mailbox</th>
              <th className="px-6 py-3">Naam</th>
              <th className="px-6 py-3">Quota (MB)</th>
              <th className="px-6 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const name = u.user ?? "";
              return (
                <tr key={name} className="border-b border-panel-border/50">
                  <td className="px-6 py-4 text-white">
                    {name}@{domain}
                  </td>
                  <td className="px-6 py-4 text-panel-muted">{u.real ?? "—"}</td>
                  <td className="px-6 py-4 text-panel-muted">{u.quota ?? "—"}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setResetUser(name);
                        setResetPass("");
                      }}
                    >
                      Wachtwoord
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteTarget(name)}>
                      Verwijderen
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">
            Geen mailboxen gevonden.
          </p>
        )}
      </Card>

      {resetUser && (
        <Card>
          <h2 className="text-lg font-medium text-white">
            Wachtwoord wijzigen — {resetUser}
          </h2>
          <div className="mt-4 flex max-w-md gap-2">
            <Input
              type="password"
              placeholder="Nieuw wachtwoord"
              value={resetPass}
              onChange={(e) => setResetPass(e.target.value)}
            />
            <Button onClick={resetPassword} disabled={loading || !resetPass}>
              Opslaan
            </Button>
            <Button variant="ghost" onClick={() => setResetUser(null)}>
              Annuleren
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Mailbox verwijderen"
        description={`Je staat op het punt ${deleteTarget}@${domain} permanent te verwijderen.`}
        confirmLabel="Verwijderen"
        confirmValue={deleteTarget ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setConfirmTyped("");
        }}
        loading={loading}
      />
    </div>
  );
}
