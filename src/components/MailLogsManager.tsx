"use client";

import { Alert, Button, Card, Input } from "@/components/ui";
import { useDomainNavReset } from "@/hooks/useDomainNavReset";
import { useCallback, useEffect, useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function MailLogsManager({
  domain,
  initialLines,
  initialError,
  isAdmin,
}: {
  domain: string;
  initialLines: string[];
  initialError: string;
  isAdmin: boolean;
}) {
  const enc = encodeURIComponent(domain);
  const [lines, setLines] = useState(initialLines);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  useDomainNavReset(domain, () => {
    setLines(initialLines);
    setQuery("");
    setError(initialError);
  });

  const search = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/domains/${enc}/mail-logs?q=${encodeURIComponent(query)}`,
      );
      const data = (await res.json()) as { lines?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setLines(data.lines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }, [enc, query]);

  const loadRecent = useCallback(async () => {
    setQuery("");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/domains/${enc}/mail-logs`);
      const data = (await res.json()) as { lines?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not load logs.");
      setLines(data.lines ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }, [enc]);

  useEffect(() => {
    if (initialError || initialLines.length > 0) return;
    void loadRecent();
  }, [initialError, initialLines.length, loadRecent]);

  return (
    <div className="space-y-6">
      <DomainPageHeader
        domain={domain}
        title="Mail logs"
        description="Postfix and Dovecot delivery lines for this domain"
      />
      {error && <Alert>{error}</Alert>}
      <Card>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-[12rem] flex-1"
            placeholder={`Filter (plain text), e.g. ${domain} or info@${domain}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
          />
          <Button onClick={() => void search()} disabled={loading}>
            {loading ? "Loading…" : "Search"}
          </Button>
          <Button variant="ghost" disabled={loading} onClick={() => void loadRecent()}>
            Show recent
          </Button>
        </div>
        <p className="mt-2 text-xs text-panel-muted">
          {lines.length} line{lines.length === 1 ? "" : "s"}
          {query.trim() ? ` matching “${query.trim()}”` : ` for ${domain}`}
        </p>
        <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-panel-border bg-panel-bg/60 p-3 font-mono text-xs text-slate-300">
          {lines.length
            ? lines.join("\n")
            : loading
              ? "Loading…"
              : "No log lines found. Ensure postfix/dovecot are running and /var/log/mail.log or journalctl is readable on the server."}
        </pre>
      </Card>
      {isAdmin && (
        <Alert variant="info">
          Logs come from <code className="text-white">/var/log/mail.log</code>, syslog,
          and <code className="text-white">journalctl</code> (Postfix/Dovecot). For queue
          actions use the server shell (<code className="text-white">mailq</code>,{" "}
          <code className="text-white">postqueue</code>).
        </Alert>
      )}
    </div>
  );
}
