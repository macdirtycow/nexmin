import { brandingCssVars, displayBranding, loadPanelBranding } from "@/lib/branding";

export async function BrandingHead() {
  const stored = await loadPanelBranding();
  const b = displayBranding(stored);
  return (
    <style
      id="qadbak-branding"
      dangerouslySetInnerHTML={{ __html: brandingCssVars(b) }}
    />
  );
}
