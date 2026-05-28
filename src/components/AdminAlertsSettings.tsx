"use client";

import { Alert, Button, Card, Input, Label } from "@/components/ui";
import type { AlertSettings } from "@/lib/alert-rules";
import { RECOMMENDED_ALERT_RULES } from "@/lib/alert-rules-presets";
import { useEffect, useState } from "react";

export function AdminAlertsSettings() {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fired, setFired] = useState<string[]>([]);

  const [bootLoading, setBootLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/alerts");
    const data = await res.json();
    if (res.ok) setSettings(data.settings ?? null);
    else setError(String(data.error ?? "Could not load alert settings."));
  }

  useEffect(() => {
    load()
      .catch(() => setError("Could not load alert settings."))
      .finally(() => setBootLoading(false));
  }, []);

  async function save() {
    if (!settings) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSuccess("Alert settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function evaluate() {
    setLoading(true);
    setFired([]);
    setError("");
    try {
      const res = await fetch("/api/admin/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Evaluate failed");
      setFired(data.fired ?? []);
      if ((data.fired as string[] | undefined)?.length === 0) {
        setSuccess("No alerts fired (thresholds not exceeded).");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluate failed");
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return (
      <Card>
        <p className="text-sm text-panel-muted">Loading alert rules…</p>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <Alert>Could not load alert settings.</Alert>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-medium text-white">Alert rules</h2>
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Email to</Label>
          <Input
            value={settings.emailTo ?? ""}
            onChange={(e) => setSettings({ ...settings, emailTo: e.target.value })}
          />
        </div>
        <div>
          <Label>Slack webhook</Label>
          <Input
            value={settings.slackWebhook ?? ""}
            onChange={(e) => setSettings({ ...settings, slackWebhook: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Telegram webhook</Label>
          <Input
            value={settings.telegramWebhook ?? ""}
            onChange={(e) =>
              setSettings({ ...settings, telegramWebhook: e.target.value })
            }
          />
        </div>
      </div>
      <ul className="text-sm text-panel-muted space-y-2">
        {settings.rules.map((r, i) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3">
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => {
                const rules = [...settings.rules];
                rules[i] = { ...r, enabled: e.target.checked };
                setSettings({ ...settings, rules });
              }}
            />
            <span>
              {r.id}: {r.metric} ≥ {r.threshold} → {r.channel}
            </span>
          </li>
        ))}
      </ul>
      {fired.length > 0 && (
        <Alert>Fired: {fired.join("; ")}</Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() =>
            setSettings((s) =>
              s
                ? {
                    ...s,
                    rules: RECOMMENDED_ALERT_RULES.map((r) => ({
                      ...r,
                      target:
                        r.channel === "email"
                          ? s.emailTo ?? ""
                          : r.channel === "slack"
                            ? s.slackWebhook ?? ""
                            : s.telegramWebhook ?? "",
                    })),
                  }
                : s,
            )
          }
        >
          Load recommended rules
        </Button>
        <Button disabled={loading} onClick={save}>
          Save
        </Button>
        <Button variant="secondary" disabled={loading} onClick={evaluate}>
          Test evaluate
        </Button>
      </div>
      <p className="text-xs text-panel-muted">
        Tip: plan een cron voor{" "}
        <code className="text-white">metrics-snapshot</code> en periodieke evaluate op de
        server.
      </p>
    </Card>
  );
}
