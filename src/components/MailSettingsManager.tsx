"use client";

import { Alert, Button, Card, Input, Label } from "@/components/ui";
import type { MailDomainSettings } from "@/lib/virtualmin";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function MailSettingsManager({
  domain,
  initialSettings,
  initialError,
}: {
  domain: string;
  initialSettings: MailDomainSettings;
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/mail-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Opslaan mislukt.");
      setSuccess("Mailinstellingen opgeslagen.");
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
        title="Mail instellingen"
        description="Catch-all en autoresponder"
      />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Card>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>Catch-all adres</Label>
            <Input
              className="mt-1"
              placeholder="leeg = uit"
              value={settings.catchAll ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, catchAll: e.target.value })
              }
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoresponderEnabled ?? false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoresponderEnabled: e.target.checked,
                })
              }
            />
            <span className="text-sm text-white">Autoresponder actief</span>
          </label>
          <div>
            <Label>Autoresponder tekst</Label>
            <textarea
              className="mt-1 w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-white"
              rows={4}
              value={settings.autoresponder ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, autoresponder: e.target.value })
              }
            />
          </div>
          <Button type="submit" disabled={loading}>
            Opslaan
          </Button>
        </form>
      </Card>
    </div>
  );
}
