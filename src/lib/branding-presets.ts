import {
  DEFAULT_BRANDING_THEME,
  type BrandingThemeColors,
} from "@/lib/branding-theme";

export type BrandingThemeId =
  | "ocean"
  | "emerald"
  | "violet"
  | "slate"
  | "sunset"
  | "rose";

export type BrandingPreset = {
  id: BrandingThemeId;
  name: string;
  description: string;
  colors: BrandingThemeColors;
};

export const BRANDING_PRESETS: BrandingPreset[] = [
  {
    id: "ocean",
    name: "Ocean",
    description: "Blue and teal — Qadbak default",
    colors: DEFAULT_BRANDING_THEME,
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Fresh green for hosting and growth",
    colors: {
      primaryColor: "#10b981",
      accentColor: "#6ee7b7",
      backgroundColor: "#0c1210",
      cardColor: "#152019",
      borderColor: "#234032",
      mutedColor: "#9ca3af",
      textColor: "#ecfdf5",
    },
  },
  {
    id: "violet",
    name: "Violet",
    description: "Modern purple accent",
    colors: {
      primaryColor: "#8b5cf6",
      accentColor: "#c4b5fd",
      backgroundColor: "#100f18",
      cardColor: "#1a1828",
      borderColor: "#2e2a42",
      mutedColor: "#a1a1aa",
      textColor: "#f5f3ff",
    },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Neutral corporate grey-blue",
    colors: {
      primaryColor: "#64748b",
      accentColor: "#94a3b8",
      backgroundColor: "#0f1115",
      cardColor: "#181b22",
      borderColor: "#2a303c",
      mutedColor: "#94a3b8",
      textColor: "#f8fafc",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm amber on dark",
    colors: {
      primaryColor: "#f59e0b",
      accentColor: "#fcd34d",
      backgroundColor: "#14110c",
      cardColor: "#1f1a14",
      borderColor: "#3d3424",
      mutedColor: "#a8a29e",
      textColor: "#fffbeb",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Bold red-pink accent",
    colors: {
      primaryColor: "#f43f5e",
      accentColor: "#fda4af",
      backgroundColor: "#140c0f",
      cardColor: "#1f1418",
      borderColor: "#3d2430",
      mutedColor: "#a1a1aa",
      textColor: "#fff1f2",
    },
  },
];

export const DEFAULT_BRANDING_THEME_ID: BrandingThemeId = "ocean";

const PRESET_BY_ID = new Map(
  BRANDING_PRESETS.map((p) => [p.id, p] as const),
);

export function isBrandingThemeId(id: string): id is BrandingThemeId {
  return PRESET_BY_ID.has(id as BrandingThemeId);
}

export function getBrandingPreset(id: string | undefined | null): BrandingPreset {
  const key = String(id ?? "").trim();
  if (isBrandingThemeId(key)) return PRESET_BY_ID.get(key)!;
  return PRESET_BY_ID.get(DEFAULT_BRANDING_THEME_ID)!;
}

/** Map legacy custom hex branding to the closest preset (for migration). */
export function inferThemeIdFromColors(
  partial?: Partial<BrandingThemeColors> | null,
): BrandingThemeId {
  const primary = String(partial?.primaryColor ?? "")
    .trim()
    .toLowerCase();
  if (!primary) return DEFAULT_BRANDING_THEME_ID;

  for (const preset of BRANDING_PRESETS) {
    if (preset.colors.primaryColor.toLowerCase() === primary) {
      return preset.id;
    }
  }
  return DEFAULT_BRANDING_THEME_ID;
}

export function colorsForThemeId(
  themeId: string | undefined | null,
): BrandingThemeColors {
  return getBrandingPreset(themeId).colors;
}
