"use client";

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
} from "@/components/ui";
import { useState } from "react";

export function AdminListView({
  title,
  apiPath,
  itemsKey,
  items,
  nameKey,
  initialError,
  createLabel,
  isAdminUser,
}: {
  title: string;
  apiPath: string;
  itemsKey: string;
  items: object[];
  nameKey: string;
  initialError: string;
  createLabel: string;
  isAdminUser?: boolean;
}) {
  const [list, setList] = useState(items);
  const [error, setError] = useState(initialError);
  const [newName, setNewName] = useState("");
  const [pass, setPass] = useState("");
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [confirmTyped, setConfirmTyped] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch(apiPath);
    const data = await res.json();
    if (res.ok) setList(data[itemsKey] ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, string> = isAdminUser
        ? { user: newName, pass }
        : { name: newName };
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setNewName("");
      setPass("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteName) return;
    setLoading(true);
    try {
      const body = isAdminUser ? { user: deleteName } : { name: deleteName };
      const res = await fetch(apiPath, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      setDeleteName(null);
      setConfirmTyped("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert>{error}</Alert>}
      <Card>
        <h2 className="text-lg font-medium text-white">{createLabel}</h2>
        <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
          <Input
            placeholder={isAdminUser ? "user" : "name"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          {isAdminUser && (
            <Input
              type="password"
              placeholder="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          )}
          <Button type="submit" disabled={loading}>Create</Button>
        </form>
      </Card>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <tbody>
            {list.map((item) => {
              const row = item as Record<string, string | undefined>;
              const label = row[nameKey] ?? row.name ?? row.user ?? "";
              return (
                <tr key={label} className="border-b border-panel-border/50">
                  <td className="px-6 py-4 text-white">{label}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="danger" onClick={() => setDeleteName(label)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="px-6 py-8 text-center text-panel-muted">No items.</p>
        )}
      </Card>
      <ConfirmDialog
        open={!!deleteName}
        title={`Delete ${title}`}
        description={`Delete ${deleteName}?`}
        confirmLabel="Delete"
        confirmValue={deleteName ?? ""}
        typedValue={confirmTyped}
        onTypedChange={setConfirmTyped}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteName(null); setConfirmTyped(""); }}
        loading={loading}
      />
    </div>
  );
}
