import "server-only";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { brandingCssVars as buildBrandingCssVars } from "@/lib/branding-css";
import {
  colorsForThemeId,
  DEFAULT_BRANDING_THEME_ID,
  getBrandingPreset,
  inferThemeIdFromColors,
  isBrandingThemeId,
  type BrandingThemeId,
} from "@/lib/branding-presets";
import {
  DEFAULT_BRANDING_THEME,
  normalizeBrandingTheme,
  type BrandingThemeColors,
} from "@/lib/branding-theme";

const DATA_DIR = path.join(process.cwd(), "data");
const BRANDING_JSON = path.join(DATA_DIR, "branding.json");
const BRANDING_DIR = path.join(DATA_DIR, "branding");
const LOGO_FILE = path.join(BRANDING_DIR, "logo.png");

export type PanelBranding = {
  brandName: string;
  tagline: string;
  themeId: BrandingThemeId;
  hasLogo: boolean;
} & BrandingThemeColors;

export type PanelBrandingInput = {
  brandName?: string;
  tagline?: string;
  themeId?: string;
  logoBase64?: string | null;
  reset?: boolean;
};

type StoredBranding = {
  brandName?: string;
  tagline?: string;
  themeId?: string;
  /** @deprecated Legacy per-color storage; migrated to themeId on load */
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  cardColor?: string;
  borderColor?: string;
  mutedColor?: string;
  textColor?: string;
};

function resolveStoredThemeId(data: StoredBranding): BrandingThemeId {
  if (data.themeId && isBrandingThemeId(data.themeId)) return data.themeId;
  return inferThemeIdFromColors(data);
}

function panelFromStored(
  data: StoredBranding,
  hasLogo: boolean,
): PanelBranding {
  const themeId = resolveStoredThemeId(data);
  const colors = normalizeBrandingTheme(colorsForThemeId(themeId));
  return {
    brandName: data.brandName!.trim(),
    tagline: (data.tagline ?? APP_TAGLINE).trim(),
    themeId,
    hasLogo,
    ...colors,
  };
}

export async function loadPanelBranding(): Promise<PanelBranding | null> {
  try {
    const raw = await readFile(BRANDING_JSON, "utf8");
    const data = JSON.parse(raw) as StoredBranding;
    if (!data.brandName?.trim()) return null;
    let hasLogo = false;
    try {
      await readFile(LOGO_FILE);
      hasLogo = true;
    } catch {
      hasLogo = false;
    }
    return panelFromStored(data, hasLogo);
  } catch {
    return null;
  }
}

export function displayBranding(
  stored: PanelBranding | null,
): PanelBranding & { isCustom: boolean } {
  if (!stored) {
    return {
      brandName: APP_NAME,
      tagline: APP_TAGLINE,
      themeId: DEFAULT_BRANDING_THEME_ID,
      hasLogo: false,
      isCustom: false,
      ...DEFAULT_BRANDING_THEME,
    };
  }
  return { ...stored, isCustom: true };
}

export function brandingCssVars(b: PanelBranding): string {
  return buildBrandingCssVars(b);
}

export function brandingThemeFromPanel(b: PanelBranding): BrandingThemeColors {
  return normalizeBrandingTheme(colorsForThemeId(b.themeId));
}

export async function savePanelBranding(
  input: PanelBrandingInput,
): Promise<PanelBranding | null> {
  if (input.reset) {
    await rm(BRANDING_JSON, { force: true });
    await rm(LOGO_FILE, { force: true });
    return null;
  }
  await mkdir(BRANDING_DIR, { recursive: true });
  const existing = (await loadPanelBranding()) ?? {
    brandName: APP_NAME,
    tagline: APP_TAGLINE,
    themeId: DEFAULT_BRANDING_THEME_ID,
    hasLogo: false,
    ...DEFAULT_BRANDING_THEME,
  };

  const themeId =
    input.themeId && isBrandingThemeId(input.themeId)
      ? input.themeId
      : existing.themeId;

  const next: StoredBranding = {
    brandName: (input.brandName ?? existing.brandName).trim() || APP_NAME,
    tagline: (input.tagline ?? existing.tagline).trim() || APP_TAGLINE,
    themeId,
  };
  await writeFile(BRANDING_JSON, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  if (input.logoBase64 === null) {
    await rm(LOGO_FILE, { force: true });
  } else if (input.logoBase64?.startsWith("data:image/")) {
    const b64 = input.logoBase64.replace(/^data:image\/\w+;base64,/, "");
    await writeFile(LOGO_FILE, Buffer.from(b64, "base64"));
  }
  return loadPanelBranding();
}

export function logoPublicPath(hasLogo: boolean): string | null {
  return hasLogo ? "/api/branding/logo" : null;
}

export function brandingPublicPayload(b: PanelBranding & { isCustom: boolean }) {
  const preset = getBrandingPreset(b.themeId);
  return {
    brandName: b.brandName,
    tagline: b.tagline,
    themeId: b.themeId,
    themeName: preset.name,
    logoUrl: logoPublicPath(b.hasLogo),
    isCustom: b.isCustom,
    ...brandingThemeFromPanel(b),
  };
}
