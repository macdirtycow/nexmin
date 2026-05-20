"use client";

import { Alert, Button, Card, Input, Label } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Inloggen mislukt.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Kan de server niet bereiken.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white">Hosting Panel</h1>
        <p className="mt-1 text-sm text-panel-muted">
          Eenvoudiger beheer bovenop VirtualMin
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <Label htmlFor="username">Gebruikersnaam</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bezig met inloggen…" : "Inloggen"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-panel-muted">
          Standaard na eerste start: admin / changeme of klant / changeme (zie README).
          Ontwikkeling: zet VIRTUALMIN_MOCK=true in .env.local.
        </p>
      </Card>
    </div>
  );
}
