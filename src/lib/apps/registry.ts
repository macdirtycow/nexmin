import type { AppTemplate, AppTemplateSummary } from "./types";
import { wordpressTemplate } from "./templates/wordpress";

/**
 * In-memory registry of app templates. New templates = drop a file in
 * src/lib/apps/templates/ and append to this array.
 */
const TEMPLATES: AppTemplate[] = [wordpressTemplate];

export function listTemplates(): AppTemplateSummary[] {
  return TEMPLATES.map(toSummary);
}

export function getTemplate(id: string): AppTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

function toSummary(t: AppTemplate): AppTemplateSummary {
  return {
    id: t.id,
    label: t.label,
    tagline: t.tagline,
    icon: t.icon,
    description: t.description,
    etaSeconds: t.etaSeconds,
    inputs: t.inputs,
  };
}
