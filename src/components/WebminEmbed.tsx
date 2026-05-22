"use client";

import { Alert, Button, Card } from "@/components/ui";
import { useEffect, useState } from "react";

export function WebminEmbed({
  title,
  description,
  fetchUrl,
  initialUrl,
  initialError,
  height = "min(70vh, 720px)",
}: {
  title: string;
  description?: string;
  fetchUrl: string;
  /** Pre-resolved URL from server — avoids a second create-login-link call. */
  initialUrl?: string | null;
  initialError?: string;
  height?: string;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(!initialUrl && !initialError);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    setIframeBlocked(false);
    try {
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open module.");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
      setUrl(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialError) {
      setError(initialError);
      setLoading(false);
      return;
    }
    if (initialUrl) {
      setUrl(initialUrl);
      setLoading(false);
      setError("");
      return;
    }
    load();
  }, [fetchUrl, initialUrl, initialError]);

  useEffect(() => {
    if (!url || loading) return;
    const t = window.setTimeout(() => setIframeBlocked(true), 12000);
    return () => window.clearTimeout(t);
  }, [url, loading]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-panel-muted">{description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            Refresh session
          </Button>
          {url && (
            <Button
              variant="ghost"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            >
              Open in new tab
            </Button>
          )}
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {iframeBlocked && url && !error && (
        <Alert>
          If the panel stays empty, open <strong>Open in new tab</strong> or run on
          the VPS:{" "}
          <code className="text-white">
            sudo bash scripts/configure-webmin-embed.sh &amp;&amp; sudo bash
            scripts/apply-hosting-nginx.sh
          </code>
          , then refresh.
        </Alert>
      )}
      <Card className="overflow-hidden p-0">
        {loading && (
          <p className="p-8 text-center text-sm text-panel-muted">Loading…</p>
        )}
        {!loading && url && (
          <iframe
            title={title}
            src={url}
            className="w-full border-0 bg-[#0f1419]"
            style={{ height }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            onLoad={() => setIframeBlocked(false)}
          />
        )}
        {!loading && !url && !error && (
          <p className="p-8 text-center text-sm text-panel-muted">No URL.</p>
        )}
      </Card>
    </div>
  );
}
