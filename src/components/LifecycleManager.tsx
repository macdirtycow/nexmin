"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
} from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DomainPageHeader } from "./DomainPageHeader";

export function LifecycleManager({
  domain,
  initialValidation,
  initialError,
}: {
  domain: string;
  initialValidation: { valid: boolean; messages: string[] };
  initialError: string;
}) {
  const router = useRouter();
  const enc = encodeURIComponent(domain);
  const [validation, setValidation] = useState(initialValidation);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [destHost, setDestHost] = useState("");
  const [newOwner, setNewOwner] = useState("");

  async function refreshValidation() {
    const res = await fetch(`/api/domains/${enc}/lifecycle`);
    const data = await res.json();
    if (res.ok) setValidation(data.validation);
  }

  async function runAction(action: string) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/domains/${enc}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          confirm: domain,
          newDomain: action === "clone" ? newDomain : undefined,
          destHost: action === "migrate" ? destHost : undefined,
          newOwner: action === "transfer" ? newOwner : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Actie mislukt.");
      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
        return;
      }
      setSuccess("Actie voltooid.");
      if (data.domain) {
        router.push(`/domains/${encodeURIComponent(data.domain)}`);
      }
      setConfirmAction(null);
      setConfirmTyped("");
      await refreshValidation();
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
        title="Levenscyclus"
        description="Validatie, klonen, migreren, overdragen, verwijderen"
      />
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <h2 className="text-lg font-medium text-white">Validatie</h2>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              validation.valid
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-red-900/50 text-red-300"
            }`}
          >
            {validation.valid ? "OK" : "Problemen"}
          </span>
          <Button variant="ghost" onClick={refreshValidation}>
            Opnieuw controleren
          </Button>
        </div>
        <ul className="mt-3 list-inside list-disc text-sm text-panel-muted">
          {validation.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-medium text-white">Klonen</h2>
        <div className="mt-4 flex max-w-md gap-2">
          <Input
            placeholder="nieuw.domein.nl"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => setConfirmAction("clone")}
            disabled={!newDomain}
          >
            Klonen
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-medium text-white">Migreren</h2>
        <div className="mt-4 flex max-w-md gap-2">
          <Input
            placeholder="doel-server.example.com"
            value={destHost}
            onChange={(e) => setDestHost(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => setConfirmAction("migrate")}
            disabled={!destHost}
          >
            Migreren
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-medium text-white">Eigenaar overdragen</h2>
        <div className="mt-4 flex max-w-md gap-2">
          <Input
            placeholder="nieuwe-gebruiker"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => setConfirmAction("transfer")}
            disabled={!newOwner}
          >
            Overdragen
          </Button>
        </div>
      </Card>

      <Card className="border-red-900/40">
        <h2 className="text-lg font-medium text-red-300">Gevarenzone</h2>
        <p className="mt-1 text-sm text-panel-muted">
          Verwijdert het virtual server permanent uit VirtualMin.
        </p>
        <Button
          className="mt-4"
          variant="danger"
          onClick={() => setConfirmAction("delete")}
        >
          Domein verwijderen
        </Button>
      </Card>

      <ConfirmDialog
        open={!!confirmAction}
        title={`Bevestig: ${confirmAction}`}
        description={`Typ de domeinnaam ${domain} om ${confirmAction} uit te voeren.`}
        confirmLabel="Uitvoeren"
        confirmValue={domain}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={() => confirmAction && runAction(confirmAction)}
        onCancel={() => {
          setConfirmAction(null);
          setConfirmTyped("");
        }}
        loading={loading}
      />
    </div>
  );
}
