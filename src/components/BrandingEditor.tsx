"use client";

import { Alert, Button, Card, Input, Label } from "@/components/ui";
import { applyBrandingTheme } from "@/lib/branding-css";
import {
  BRANDING_COLOR_FIELDS,
  type BrandingThemeColors,
} from "@/lib/branding-theme";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BrandingState = BrandingThemeColors & {
  brandName: string;
  tagline: string;
  logoUrl: string | null;
  isCustom: boolean;
};

function themeFromForm(form: BrandingState): BrandingThemeColors {
  return {
    primaryColor: form.primaryColor,
    accentColor: form.accentColor,
    backgroundColor: form.backgroundColor,
    cardColor: form.cardColor,
    borderColor: form.borderColor,
    mutedColor: form.mutedColor,
    textColor: form.textColor,
  };
}

function ColorPicker({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Input
          id={id}
          type="color"
          className="h-10 w-14 shrink-0 cursor-pointer p-1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          type="text"
          className="font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
          placeholder="#000000"
        />
      </div>
      <p className="mt-1 text-xs text-panel-muted">{hint}</p>
    </div>
  );
}

export function BrandingEditor({ initial }: { initial: BrandingState }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logoUrl);

  const theme = useMemo(() => themeFromForm(form), [form]);

  useEffect(() => {
    applyBrandingTheme(theme);
  }, [theme]);

  function patchTheme(patch: Partial<BrandingThemeColors>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as BrandingState & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setForm(data);
      setLogoPreview(data.logoUrl);
      applyBrandingTheme(themeFromForm(data));
      router.refresh();
      setSuccess("Branding saved — theme applies across login and panel.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  function saveAll() {
    void save({
      brandName: form.brandName,
      tagline: form.tagline,
      ...themeFromForm(form),
    });
  }

  function onLogoFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setLogoPreview(dataUrl);
      void save({
        brandName: form.brandName,
        tagline: form.tagline,
        ...themeFromForm(form),
        logoBase64: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  }

  const accentFields = BRANDING_COLOR_FIELDS.filter((f) =>
    ["primaryColor", "accentColor"].includes(f.key),
  );
  const surfaceFields = BRANDING_COLOR_FIELDS.filter((f) =>
    ["backgroundColor", "cardColor", "borderColor", "mutedColor", "textColor"].includes(
      f.key,
    ),
  );

  return (
    <Card>
      <h2 className="text-lg font-medium text-panel-text">Panel branding</h2>
      <p className="mt-2 text-sm text-panel-muted">
        White-label the full panel: name, logo, buttons, backgrounds, cards, borders,
        and text. Changes preview live below.
      </p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="brand-name">Brand name</Label>
          <Input
            id="brand-name"
            className="mt-1"
            value={form.brandName}
            onChange={(e) => setForm({ ...form, brandName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            className="mt-1"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </div>
      </div>

      <h3 className="mt-8 text-sm font-semibold text-panel-text">Accent colors</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {accentFields.map((f) => (
          <ColorPicker
            key={f.key}
            id={f.key}
            label={f.label}
            hint={f.hint}
            value={form[f.key]}
            onChange={(hex) => patchTheme({ [f.key]: hex })}
          />
        ))}
      </div>

      <h3 className="mt-8 text-sm font-semibold text-panel-text">
        Surfaces & typography
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {surfaceFields.map((f) => (
          <ColorPicker
            key={f.key}
            id={f.key}
            label={f.label}
            hint={f.hint}
            value={form[f.key]}
            onChange={(hex) => patchTheme({ [f.key]: hex })}
          />
        ))}
      </div>

      <div
        className="mt-8 overflow-hidden rounded-xl border border-panel-border"
        aria-label="Panel theme preview"
      >
        <div className="border-b border-panel-border bg-panel-card/80 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-panel-muted">
            Live preview
          </p>
        </div>
        <div className="bg-panel-bg p-4">
          <div className="overflow-hidden rounded-lg border border-panel-border bg-panel-card">
            <div className="flex items-center gap-3 border-b border-panel-border px-4 py-3">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt=""
                  className="h-8 w-auto max-w-[100px] object-contain"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-accent/25 text-sm">
                  ◆
                </span>
              )}
              <span className="font-semibold text-panel-text">{form.brandName}</span>
              <nav className="ml-auto flex gap-1">
                <span className="rounded-lg bg-panel-accent/20 px-2 py-1 text-xs text-panel-text">
                  Active
                </span>
                <span className="rounded-lg px-2 py-1 text-xs text-panel-muted">
                  Domains
                </span>
              </nav>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-sm text-panel-muted">{form.tagline}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="text-sm">
                  Primary
                </Button>
                <Button type="button" variant="secondary" className="text-sm">
                  Secondary
                </Button>
                <span className="self-center text-sm text-panel-link">Link</span>
              </div>
              <Input placeholder="Sample input field" className="max-w-xs" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Label htmlFor="logo">Logo (PNG / JPEG / WebP)</Label>
        <Input
          id="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="mt-1"
          disabled={busy}
          onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
        />
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoPreview}
            alt="Logo preview"
            className="mt-3 h-12 w-auto max-w-[200px] object-contain"
          />
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={saveAll}>
          {busy ? "Saving…" : "Save branding"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => save({ reset: true })}>
          Reset to Qadbak default
        </Button>
      </div>
    </Card>
  );
}
