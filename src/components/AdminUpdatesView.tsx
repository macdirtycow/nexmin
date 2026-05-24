"use client";

import { Alert, Button, Card } from "@/components/ui";
import type { LinuxUpdateStatus, QadbakUpdateStatus } from "@/lib/updates-helper";
import { useCallback, useEffect, useRef, useState } from "react";

function formatTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminUpdatesView() {
  const [available, setAvailable] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [error, setError] = useState("");
  const [linux, setLinux] = useState<LinuxUpdateStatus | null>(null);
  const [qadbak, setQadbak] = useState<QadbakUpdateStatus | null>(null);
  const [linuxJobId, setLinuxJobId] = useState<string | null>(null);
  const [qadbakJobId, setQadbakJobId] = useState<string | null>(null);
  const [linuxLog, setLinuxLog] = useState("");
  const [qadbakLog, setQadbakLog] = useState("");
  const [backupNote, setBackupNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLinux = useCallback(async (refresh = false) => {
    const q = refresh ? "?refresh=1" : "";
    const res = await fetch(`/api/admin/updates/linux${q}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Linux status failed.");
    if (data.available === false) {
      setAvailable(false);
      setSetupError(data.error ?? "Updates helper unavailable.");
      return;
    }
    setAvailable(true);
    setLinux(data.linux ?? null);
  }, []);

  const loadQadbak = useCallback(async () => {
    const res = await fetch("/api/admin/updates/qadbak");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Qadbak status failed.");
    if (data.available === false) {
      setAvailable(false);
      setSetupError(data.error ?? "Updates helper unavailable.");
      return;
    }
    setQadbak(data.qadbak ?? null);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadLinux(), loadQadbak()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }, [loadLinux, loadQadbak]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pollJob = useCallback(
    async (kind: "linux" | "qadbak", jobId: string) => {
      const url =
        kind === "linux"
          ? `/api/admin/updates/linux?jobId=${encodeURIComponent(jobId)}`
          : `/api/admin/updates/qadbak?jobId=${encodeURIComponent(jobId)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) return;
      if (kind === "linux") {
        setLinuxLog(data.log ?? "");
        if (data.job?.status !== "running") {
          setLinuxJobId(null);
          await loadLinux(true);
        }
      } else {
        setQadbakLog(data.log ?? "");
        if (data.job?.status !== "running") {
          setQadbakJobId(null);
          await loadQadbak();
        }
      }
    },
    [loadLinux, loadQadbak],
  );

  useEffect(() => {
    const active = linuxJobId ?? qadbakJobId;
    if (!active) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    const tick = () => {
      if (linuxJobId) void pollJob("linux", linuxJobId);
      if (qadbakJobId) void pollJob("qadbak", qadbakJobId);
    };
    tick();
    pollRef.current = setInterval(tick, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [linuxJobId, qadbakJobId, pollJob]);

  async function post(
    endpoint: "linux" | "qadbak",
    action: "refresh" | "upgrade",
  ) {
    const key = `${endpoint}-${action}`;
    setActing(key);
    setError("");
    try {
      const res = await fetch(`/api/admin/updates/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      if (endpoint === "linux") {
        if (data.linux) setLinux(data.linux);
        if (data.job?.id) {
          setLinuxJobId(data.job.id);
          setLinuxLog("Upgrade started…\n");
        }
      } else {
        if (data.qadbak) setQadbak(data.qadbak);
        if (data.job?.id) {
          setQadbakJobId(data.job.id);
          setQadbakLog("Update started…\n");
          if (data.backupDir) {
            setBackupNote(
              `Backed up panel data to ${data.backupDir} (${(data.copied ?? []).join(", ") || "none"})`,
            );
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      {!available && (
        <Alert>
          Run on the VPS:{" "}
          <code className="text-xs">
            sudo bash /opt/qadbak/scripts/configure-updates-sudo.sh
          </code>
          <br />
          {setupError}
        </Alert>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">Linux packages</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={loading || !available || !!linuxJobId}
              onClick={() => post("linux", "refresh")}
            >
              {acting === "linux-refresh" ? "Refreshing…" : "Refresh status"}
            </Button>
            <Button
              variant="danger"
              disabled={
                loading ||
                !available ||
                !!linuxJobId ||
                (linux?.upgradable ?? 0) === 0
              }
              onClick={() => {
                if (
                  !window.confirm(
                    "Run apt-get upgrade -y on this server? This may take several minutes.",
                  )
                ) {
                  return;
                }
                void post("linux", "upgrade");
              }}
            >
              {acting === "linux-upgrade" || linuxJobId
                ? "Upgrading…"
                : "Install updates"}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-panel-muted">
          Cached status refreshes hourly; use Refresh for apt-get update + simulate.
        </p>
        {linux && (
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <span className="text-panel-muted">Summary: </span>
              <span className="text-white">{linux.summaryLine}</span>
            </li>
            <li>
              <span className="text-panel-muted">Upgradable: </span>
              <span className="text-white">{linux.upgradable}</span>
              <span className="text-panel-muted"> · Security mentions: </span>
              <span className="text-white">{linux.security}</span>
            </li>
            <li>
              <span className="text-panel-muted">Reboot required: </span>
              <span className={linux.rebootRequired ? "text-amber-400" : "text-emerald-400"}>
                {linux.rebootRequired ? "Yes (/var/run/reboot-required)" : "No"}
              </span>
            </li>
            <li className="text-panel-muted">Checked: {formatTime(linux.updatedAt)}</li>
          </ul>
        )}
        {linuxLog && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-panel-border bg-panel-bg p-3 text-xs text-panel-muted">
            {linuxLog}
          </pre>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-white">Qadbak application</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={loading || !available || !!qadbakJobId}
              onClick={() => post("qadbak", "refresh")}
            >
              {acting === "qadbak-refresh" ? "Checking…" : "Check for updates"}
            </Button>
            <Button
              disabled={loading || !available || !!qadbakJobId}
              onClick={() => {
                if (
                  !window.confirm(
                    "Run update-qadbak.sh (git pull, npm build, pm2 restart)? Panel data is backed up first.",
                  )
                ) {
                  return;
                }
                void post("qadbak", "upgrade");
              }}
            >
              {acting === "qadbak-upgrade" || qadbakJobId
                ? "Updating…"
                : "Update Qadbak"}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-panel-muted">
          Uses git fetch and scripts/update-qadbak.sh. Backs up users.json and
          native-domains.json before starting.
        </p>
        {backupNote && (
          <p className="mt-2 text-sm text-emerald-400">{backupNote}</p>
        )}
        {qadbak && (
          <ul className="mt-4 space-y-2 text-sm">
            {!qadbak.isGit && (
              <li className="text-panel-muted">{qadbak.message ?? "Not a git repo."}</li>
            )}
            {qadbak.isGit && (
              <>
                <li>
                  <span className="text-panel-muted">Commit: </span>
                  <code className="text-white">{qadbak.commit}</code>
                  <span className="text-panel-muted"> ({qadbak.branch})</span>
                </li>
                {qadbak.remoteUrl && (
                  <li className="text-panel-muted truncate">Origin: {qadbak.remoteUrl}</li>
                )}
                <li>
                  <span className="text-panel-muted">Behind origin: </span>
                  <span className="text-white">
                    {qadbak.behind === -1
                      ? "Could not fetch"
                      : qadbak.behind === 0
                        ? "Up to date"
                        : `${qadbak.behind} commit(s)`}
                  </span>
                </li>
                <li className="text-panel-muted">
                  Checked: {formatTime(qadbak.checkedAt)}
                </li>
              </>
            )}
          </ul>
        )}
        {qadbakLog && (
          <pre className="mt-4 max-h-64 overflow-auto rounded-lg border border-panel-border bg-panel-bg p-3 text-xs text-panel-muted">
            {qadbakLog}
          </pre>
        )}
      </Card>
    </div>
  );
}
