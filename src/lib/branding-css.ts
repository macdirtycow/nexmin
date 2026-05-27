import {
  DEFAULT_BRANDING_THEME,
  normalizeBrandingTheme,
  type BrandingThemeColors,
} from "@/lib/branding-theme";

export { DEFAULT_BRANDING_THEME } from "@/lib/branding-theme";
export type { BrandingThemeColors } from "@/lib/branding-theme";

export const DEFAULT_PRIMARY = DEFAULT_BRANDING_THEME.primaryColor;
export const DEFAULT_ACCENT = DEFAULT_BRANDING_THEME.accentColor;

export function hexToRgbChannels(hex: string): string | null {
  const c = String(hex || "").trim();
  let m = c.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (m) {
    return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
  }
  m = c.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (m) {
    const r = parseInt(m[1] + m[1], 16);
    const g = parseInt(m[2] + m[2], 16);
    const b = parseInt(m[3] + m[3], 16);
    return `${r} ${g} ${b}`;
  }
  return null;
}

function varBlock(name: string, hex: string): string {
  const rgb = hexToRgbChannels(hex) ?? "0 0 0";
  return `  --${name}:${hex};\n  --${name}-rgb:${rgb};`;
}

export function brandingCssVars(theme: Partial<BrandingThemeColors>): string {
  const t = normalizeBrandingTheme(theme);
  return `:root{
${varBlock("brand-primary", t.primaryColor)}${varBlock("brand-accent", t.accentColor)}${varBlock("panel-bg", t.backgroundColor)}${varBlock("panel-card", t.cardColor)}${varBlock("panel-border", t.borderColor)}${varBlock("panel-muted", t.mutedColor)}${varBlock("panel-text", t.textColor)}
}`;
}

/** @deprecated Use applyBrandingTheme */
export function applyBrandingToDocument(
  primaryColor: string,
  accentColor: string,
): void {
  applyBrandingTheme({ primaryColor, accentColor });
}

export function applyBrandingTheme(theme: Partial<BrandingThemeColors>): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById("qadbak-branding");
  if (!el) {
    el = document.createElement("style");
    el.id = "qadbak-branding";
    document.head.appendChild(el);
  }
  el.textContent = brandingCssVars(theme);
}
