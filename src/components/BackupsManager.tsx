"use client";

import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Label,
} from "@/components/ui";
import type { ScheduledBackup } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function BackupsManager({
  domain,
  initialScheduled,
  canBackup,
  canRestore,
  initialError,
}: {
  domain: string;
  initialScheduled: ScheduledBackup[];
  canBackup: boolean;
  canRestore: boolean;
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoreSource, setRestoreSource] = useState("");
  const [restoreTest, setRestoreTest] = useState(true);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [confirmTyped, setConfirmTyped] = useState("");

  async function startBackup() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/backups`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Back-up mislukt.");
      setSuccess("Back-up gestart. Controleer VirtualMin voor voortgang.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/domains/${enc}/backups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Wijzigen mislukt.");
      setScheduled(data.scheduled ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  async function runRestore() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/backups/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: restoreSource, test: restoreTest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Restore mislukt.");
      setSuccess(
        restoreTest
          ? "Test-restore uitgevoerd (geen wijzigingen)."
          : "Restore gestart. Controleer VirtualMin voor voortgang.",
      );
      setShowRestoreConfirm(false);
      setConfirmTyped("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <DomainPageHeader domain={domain} title="Back-ups" />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {canBackup && (
        <div className="flex justify-end">
          <Button onClick={startBackup} disabled={loading}>
            {loading ? "Bezig…" : "Nu back-uppen"}
          </Button>
        </div>
      )}

      <Card>
        <h2 className="text-lg font-medium text-white">Geplande back-ups</h2>
        {scheduled.length === 0 ? (
          <p className="mt-4 text-sm text-panel-muted">Geen schema ingesteld.</p>
        ) : (
          <ul className="mt-4 divide-y divide-panel-border">
            {scheduled.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white">{s.schedule ?? "Onbekend schema"}</p>
                  <p className="text-sm text-panel-muted">Bestemming: {s.dest ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.enabled === "1" ? "success" : "warning"}>
                    {s.enabled === "1" ? "Actief" : "Uit"}
                  </Badge>
                  {canBackup && (
                    <Button
                      variant="secondary"
                      disabled={loading}
                      onClick={() =>
                        toggleSchedule(s.id, s.enabled !== "1")
                      }
                    >
                      {s.enabled === "1" ? "Uitzetten" : "Aanzetten"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canRestore && (
        <Card>
          <h2 className="text-lg font-medium text-white">Restore</h2>
          <p className="mt-2 text-sm text-panel-muted">
            Lokaal pad of cloud-URL (bijv. s3://…). Gebruik eerst een test-restore.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="restore-source">Bron</Label>
              <Input
                id="restore-source"
                className="mt-1"
                placeholder="/backup/voorbeeld.nl.tgz"
                value={restoreSource}
                onChange={(e) => setRestoreSource(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-panel-muted">
              <input
                type="checkbox"
                checked={restoreTest}
                onChange={(e) => setRestoreTest(e.target.checked)}
              />
              Alleen test (geen echte restore)
            </label>
            <Button
              variant="danger"
              disabled={loading || !restoreSource.trim()}
              onClick={() => setShowRestoreConfirm(true)}
            >
              Restore starten
            </Button>
          </div>
        </Card>
      )}

      {!canBackup && (
        <Alert variant="info">
          Als klant kun je geplande back-ups bekijken. Een handmatige back-up starten kan alleen de beheerder.
        </Alert>
      )}

      <ConfirmDialog
        open={showRestoreConfirm}
        title="Restore bevestigen"
        description={
          restoreTest
            ? `Test-restore voor ${domain} vanaf ${restoreSource}?`
            : `WAARSCHUWING: restore overschrijft data voor ${domain}. Bron: ${restoreSource}`
        }
        confirmLabel={restoreTest ? "Test uitvoeren" : "Restore uitvoeren"}
        confirmValue={domain}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={runRestore}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setConfirmTyped("");
        }}
        loading={loading}
      />
    </div>
  );
}
