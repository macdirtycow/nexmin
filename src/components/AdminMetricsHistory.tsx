"use client";

import { Button, Card } from "@/components/ui";
import type { MetricsSnapshot } from "@/lib/metrics-history";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const RANGES = [
  { hours: 24, label: "24 uur" },
  { hours: 168, label: "7 dagen" },
  { hours: 720, label: "30 dagen" },
] as const;

function maxChartBars(hours: number): number {
  if (hours <= 24) return 48;
  if (hours <= 168) return 84;
  return 96;
}

/** Evenly sample points so the chart reflects the full selected window. */
function sampleForChart(history: MetricsSnapshot[], maxBars: number): MetricsSnapshot[] {
  if (history.length <= maxBars) return history;
  if (maxBars <= 1) return history.slice(-1);
  const out: MetricsSnapshot[] = [];
  for (let i = 0; i < maxBars; i++) {
    const idx = Math.round((i / (maxBars - 1)) * (history.length - 1));
    out.push(history[idx]);
  }
  return out;
}

function formatRangeCaption(hours: number, history: MetricsSnapshot[]): string {
  const label = RANGES.find((r) => r.hours === hours)?.label ?? `${hours} uur`;
  if (history.length === 0) return label;
  const first = new Date(history[0].ts);
  const last = new Date(history[history.length - 1].ts);
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${label}: ${fmt(first)} → ${fmt(last)} (${history.length} snapshots)`;
}

function diskPct(h: MetricsSnapshot): number {
  const p = Number(h.diskRootUsePct);
  return Number.isFinite(p) ? Math.max(0, p) : 0;
}

function memPct(h: MetricsSnapshot): number {
  if (h.memTotalKb <= 0) return 0;
  const p = Math.round((h.memUsedKb / h.memTotalKb) * 100);
  return Number.isFinite(p) ? Math.max(0, p) : 0;
}

export function AdminMetricsHistory() {
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(168);
  const [loadError, setLoadError] = useState("");
  const loadSeq = useRef(0);

  const load = useCallback(async (h: number) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/admin/metrics-history?hours=${h}`);
      const data = await res.json();
      if (seq !== loadSeq.current) return;
      if (!res.ok) {
        setLoadError(String(data.error ?? "Could not load metrics history."));
        setHistory([]);
        return;
      }
      setHistory((data.history as MetricsSnapshot[]) ?? []);
    } catch {
      if (seq !== loadSeq.current) return;
      setLoadError("Could not load metrics history.");
      setHistory([]);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  function selectRange(nextHours: number) {
    if (nextHours !== hours) {
      setHours(nextHours);
      setHistory([]);
    } else {
      void load(nextHours);
    }
  }

  useEffect(() => {
    setHistory([]);
    void load(hours);
  }, [hours, load]);

  const chartPoints = useMemo(
    () => sampleForChart(history, maxChartBars(hours)),
    [history, hours],
  );

  const maxDisk = Math.max(1, ...chartPoints.map(diskPct));
  const maxMem = Math.max(1, ...chartPoints.map(memPct));

  const rangeCaption = formatRangeCaption(hours, history);

  async function snapshot() {
    const h = hours;
    const seq = ++loadSeq.current;
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/metrics-history", { method: "POST" });
      const data = await res.json();
      if (seq !== loadSeq.current) return;
      if (!res.ok) {
        setLoadError(String(data.error ?? "Snapshot failed."));
        return;
      }
      await load(h);
    } catch {
      if (seq === loadSeq.current) setLoadError("Snapshot failed.");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">Metrics history</h2>
          <p className="mt-1 text-xs text-panel-muted">{rangeCaption}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => {
            const active = hours === r.hours;
            return (
              <button
                key={r.hours}
                type="button"
                aria-pressed={active}
                disabled={loading}
                onClick={() => selectRange(r.hours)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                  active
                    ? "border-panel-accent bg-panel-accent/20 text-white shadow-sm"
                    : "border-panel-border bg-slate-800/80 text-slate-200 hover:border-slate-500 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            );
          })}
          <Button variant="secondary" disabled={loading} onClick={() => void load(hours)}>
            Refresh
          </Button>
          <Button disabled={loading} onClick={() => snapshot()}>
            Record snapshot
          </Button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-red-300" role="alert">
          {loadError}
        </p>
      )}

      {loading && history.length === 0 ? (
        <p className="text-sm text-panel-muted">Loading metrics…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-panel-muted">
          No history yet. Add cron: provisioning-helper metrics-snapshot
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-panel-muted mb-2">Disk / use %</p>
            <div className="flex h-24 items-end gap-px rounded bg-panel-bg/40 p-1">
              {chartPoints.map((h, i) => (
                <div
                  key={`d-${h.ts}-${i}`}
                  className="flex-1 bg-brand/70 min-w-[2px]"
                  style={{ height: `${(diskPct(h) / maxDisk) * 100}%` }}
                  title={`${h.ts}: ${diskPct(h)}%`}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-panel-muted mb-2">Memory use %</p>
            <div className="flex h-24 items-end gap-px rounded bg-panel-bg/40 p-1">
              {chartPoints.map((h, i) => {
                const pct = memPct(h);
                return (
                  <div
                    key={`m-${h.ts}-${i}`}
                    className="flex-1 bg-emerald-500/70 min-w-[2px]"
                    style={{ height: `${(pct / maxMem) * 100}%` }}
                    title={`${h.ts}: ${pct}%`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
