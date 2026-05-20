"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { CronJob } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function CronManager({
  domain,
  initialJobs,
  canEdit,
  initialError,
}: {
  domain: string;
  initialJobs: CronJob[];
  canEdit: boolean;
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [jobs, setJobs] = useState(initialJobs);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState("0 2 * * *");
  const [command, setCommand] = useState("");
  const [user, setUser] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");

  async function refresh() {
    const res = await fetch(`/api/domains/${enc}/cron`);
    const data = await res.json();
    if (res.ok) setJobs(data.jobs ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule, command, user: user || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Aanmaken mislukt.");
      setSuccess("Cron-job toegevoegd.");
      setCommand("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/domains/${enc}/cron`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verwijderen mislukt.");
      setDeleteId(null);
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
      <DomainPageHeader
        domain={domain}
        title="Cron-taken"
        description="Geplande commando's (cron-syntax: min uur dag maand weekdag)"
      />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {!canEdit && (
        <Alert variant="info">Alleen bekijken — aanpassen kan de beheerder.</Alert>
      )}

      {canEdit && (
        <Card>
          <h2 className="text-lg font-medium text-white">Nieuwe taak</h2>
          <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Schema (cron)</Label>
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="0 2 * * *"
              />
            </div>
            <div>
              <Label>Gebruiker (optioneel)</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Commando</Label>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              Toevoegen
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-panel-border bg-panel-bg/50 text-panel-muted">
            <tr>
              <th className="px-6 py-3">Schema</th>
              <th className="px-6 py-3">Commando</th>
              <th className="px-6 py-3">User</th>
              {canEdit && <th className="px-6 py-3 text-right">Acties</th>}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-panel-border/50">
                <td className="px-6 py-4 font-mono text-xs text-white">{j.schedule}</td>
                <td className="px-6 py-4 text-panel-muted">{j.command}</td>
                <td className="px-6 py-4 text-panel-muted">{j.user ?? "—"}</td>
                {canEdit && (
                  <td className="px-6 py-4 text-right">
                    <Button variant="danger" onClick={() => setDeleteId(j.id)}>
                      Verwijderen
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">Geen cron-jobs.</p>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        title="Cron-job verwijderen"
        description={`Verwijder job ${deleteId}?`}
        confirmLabel="Verwijderen"
        confirmValue={deleteId ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteId(null);
          setConfirmTyped("");
        }}
        loading={loading}
      />
    </div>
  );
}
