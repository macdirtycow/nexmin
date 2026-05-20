"use client";

import { Alert, Button, Card } from "@/components/ui";
import { useState } from "react";

export function ServerConfigButton() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/server/check-config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check mislukt.");
      setMessage(data.message ?? "OK");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-medium text-white">Serverconfiguratie</h2>
      <p className="mt-1 text-sm text-panel-muted">
        VirtualMin check-config (alleen beheerder)
      </p>
      <Button className="mt-4" variant="secondary" onClick={check} disabled={loading}>
        {loading ? "Bezig…" : "Configuratie controleren"}
      </Button>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {message && (
        <pre className="mt-3 max-h-48 overflow-auto rounded bg-panel-bg p-3 text-xs text-slate-300">
          {message}
        </pre>
      )}
    </Card>
  );
}
