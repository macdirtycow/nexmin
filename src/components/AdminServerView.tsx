"use client";

import { Alert, Badge, Button, Card } from "@/components/ui";
import type { BandwidthRow, ServerService } from "@/lib/virtualmin";
import { useState } from "react";

export function AdminServerView({
  initialBandwidth,
  initialServices,
  initialError,
}: {
  initialBandwidth: BandwidthRow[];
  initialServices: ServerService[];
  initialError: string;
}) {
  const [bandwidth] = useState(initialBandwidth);
  const [services, setServices] = useState(initialServices);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState<string | null>(null);

  async function restart(service: string) {
    setLoading(service);
    setError("");
    try {
      const res = await fetch("/api/admin/server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Restart failed.");
      const listRes = await fetch("/api/admin/server");
      const listData = await listRes.json();
      if (listRes.ok) setServices(listData.services ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Card>
        <h2 className="text-lg font-medium text-white">Services</h2>
        <ul className="mt-4 divide-y divide-panel-border">
          {services.map((s) => (
            <li key={s.service} className="flex items-center justify-between py-3">
              <span className="text-white">{s.service}</span>
              <div className="flex items-center gap-2">
                <Badge tone={s.status === "running" ? "success" : "warning"}>
                  {s.status}
                </Badge>
                <Button
                  variant="secondary"
                  disabled={loading === s.service}
                  onClick={() => restart(s.service)}
                >
                  {loading === s.service ? "Working…" : "Restart"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="overflow-hidden p-0">
        <h2 className="px-6 pt-6 text-lg font-medium text-white">Bandwidth</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-t border-panel-border text-panel-muted">
            <tr>
              <th className="px-6 py-3">Domain</th>
              <th className="px-6 py-3">Used (MB)</th>
              <th className="px-6 py-3">Limit</th>
            </tr>
          </thead>
          <tbody>
            {bandwidth.map((b) => (
              <tr key={b.domain} className="border-t border-panel-border/50">
                <td className="px-6 py-3 text-white">{b.domain}</td>
                <td className="px-6 py-3">{b.used ?? "—"}</td>
                <td className="px-6 py-3">{b.limit ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
