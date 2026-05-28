"use client";

import { Alert, Button, Card } from "@/components/ui";
import { useDomainNavReset } from "@/hooks/useDomainNavReset";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function LogsManager({
  domain,
  initialLog,
  initialType,
  initialError,
}: {
  domain: string;
  initialLog: string;
  initialType: "access" | "error";
  initialError: string;
}) {
  const enc = encodeURIComponent(domain);
  const [logType, setLogType] = useState<"access" | "error">(initialType);
  const [log, setLog] = useState(initialLog);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  useDomainNavReset(domain, () => {
    setLogType(initialType);
    setLog(initialLog);
    setError(initialError);
  });

  async function load(type: "access" | "error") {
    setLogType(type);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/domains/${enc}/logs?type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed.");
      setLog(data.log ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <DomainPageHeader
        domain={domain}
        title="Website logs"
        description="Access and error logs from the webserver"
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <Button
          variant={logType === "access" ? "primary" : "secondary"}
          onClick={() => load("access")}
          disabled={loading}
        >
          Access log
        </Button>
        <Button
          variant={logType === "error" ? "primary" : "secondary"}
          onClick={() => load("error")}
          disabled={loading}
        >
          Error log
        </Button>
      </div>
      <Card>
        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-all text-xs text-slate-300 font-mono">
          {loading ? "Loading…" : log || "No log lines."}
        </pre>
      </Card>
    </div>
  );
}
