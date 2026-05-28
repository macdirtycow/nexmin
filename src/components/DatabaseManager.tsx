"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { HostedDatabase } from "@/lib/types";
import Link from "next/link";
import { useDomainNavReset } from "@/hooks/useDomainNavReset";
import { useState } from "react";

export function DatabaseManager({
  domain,
  initialDatabases,
  initialError,
}: {
  domain: string;
  initialDatabases: HostedDatabase[];
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [databases, setDatabases] = useState(initialDatabases);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [dbType, setDbType] = useState("mysql");
  const [loading, setLoading] = useState(false);
  const [passTarget, setPassTarget] = useState<string | null>(null);
  const [newDbPass, setNewDbPass] = useState("");
  const [confirmTyped, setConfirmTyped] = useState("");

  useDomainNavReset(domain, () => {
    setDatabases(initialDatabases);
    setError(initialError);
    setSuccess("");
    setPassTarget(null);
    setShowCreate(false);
    setConfirmTyped("");
  });

  async function refresh() {
    const res = await fetch(`/api/domains/${enc}/databases`);
    const data = await res.json();
    if (res.ok) setDatabases(data.databases);
  }

  async function createDb(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/databases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pass, type: dbType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed.");
      setSuccess(`Database ${name} created.`);
      setShowCreate(false);
      setName("");
      setPass("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword() {
    if (!passTarget || !newDbPass) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/databases`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: passTarget, pass: newDbPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed.");
      setSuccess(`Password for ${passTarget} updated.`);
      setPassTarget(null);
      setNewDbPass("");
      setConfirmTyped("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-panel-muted">
          <Link href={`/domains/${enc}`} className="hover:text-white">
            ← {domain}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Databases</h1>
        <p className="mt-1 text-sm text-panel-muted">
          Databases for {domain}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "New database"}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <h2 className="text-lg font-medium text-white">Create database</h2>
          <form onSubmit={createDb} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="dbname">Name</Label>
              <Input
                id="dbname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="dbtype">Type</Label>
              <select
                id="dbtype"
                className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm"
                value={dbType}
                onChange={(e) => setDbType(e.target.value)}
              >
                <option value="mysql">MySQL</option>
                <option value="postgres">PostgreSQL</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dbpass">Password</Label>
              <Input
                id="dbpass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Working…" : "Create"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Host</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {databases.map((db) => (
              <tr key={db.name} className="border-b border-panel-border/50">
                <td className="px-6 py-4 text-white">{db.name}</td>
                <td className="px-6 py-4 text-panel-muted">{db.type ?? "mysql"}</td>
                <td className="px-6 py-4 text-panel-muted">{db.host ?? "localhost"}</td>
                <td className="px-6 py-4 text-right">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPassTarget(db.name ?? "");
                      setNewDbPass("");
                      setConfirmTyped("");
                    }}
                  >
                    Change password
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {databases.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">
            No databases found.
          </p>
        )}
      </Card>

      <ConfirmDialog
        open={!!passTarget}
        title="Change database password"
        description={`Confirm changing the password for database ${passTarget} on ${domain}.`}
        confirmLabel="Save password"
        confirmValue={passTarget ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={savePassword}
        onCancel={() => {
          setPassTarget(null);
          setConfirmTyped("");
          setNewDbPass("");
        }}
        loading={loading}
      />

      {passTarget && (
        <Card>
          <Label htmlFor="newpass">New password</Label>
          <Input
            id="newpass"
            type="password"
            className="mt-2 max-w-md"
            value={newDbPass}
            onChange={(e) => setNewDbPass(e.target.value)}
          />
        </Card>
      )}
    </div>
  );
}
